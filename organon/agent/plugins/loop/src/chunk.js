/**
 * One chunk of the search: load the active strategy of each slot, run the
 * Loop strategy for up to k attempts, and save every candidate. Strategies
 * receive `core`, which calls the other slots by name and provides the shared
 * operations; the core itself makes no search decisions.
 *
 * @module @organon/loop/chunk
 */

import { access, copyFile, mkdir, readdir, readFile, stat, writeFile } from 'node:fs/promises'
import { dirname, join, resolve } from 'node:path'
import { readActive } from './active.js'
import { copyProject } from './project.js'
import { BUDGET_FILE, readBudgetLimit, readTask } from './run.js'
import { budgetUsed, CANDIDATES_DIR, folderOf, nextId, readRows, writeRows } from './rows.js'
import { best, childCount, firstLine, isBroken, isValid, stallCount } from './stats.js'
import { loadStrategy } from './strategies.js'

export const EVALS_DIR = 'search/evals'

/**
 * A counting limit for concurrent calls. A missing or non-positive maximum
 * means no limit.
 * @param {unknown} max
 */
export function limiter(max) {
  const limit = Number.isSafeInteger(max) && max > 0 ? max : Infinity
  let running = 0
  const waiting = []
  const watching = []
  const wake = () => {
    while (running < limit && waiting.length > 0) {
      running += 1
      waiting.shift()()
    }
    while (running < limit && watching.length > 0) watching.shift()()
  }
  return {
    /** Take a place, waiting for one if needed; resolves with the release function. */
    async acquire() {
      if (running < limit) running += 1
      else await new Promise(resolvePlace => waiting.push(resolvePlace))
      let released = false
      return () => {
        if (released) return
        released = true
        running -= 1
        wake()
      }
    },
    /** Wait until a place is free, without taking it. */
    async free() {
      if (running < limit) return
      await new Promise(resolveFree => watching.push(resolveFree))
    },
    get running() {
      return running
    },
  }
}

/**
 * Run one chunk.
 * @param {object} options
 * @param {string} options.root - the run folder.
 * @param {string} options.dir - the strategies folder.
 * @param {number} options.k - attempts requested.
 * @param {object} options.agent - the main agent; workers run for it.
 * @param {AbortSignal} options.signal - cancels the chunk.
 * @param {object} options.workers - the worker plugin's `workers` service.
 * @param {(task: object, program: string, signal: AbortSignal) => Promise<object>} options.evaluate - runs the
 *   task's evaluator on one program.
 * @returns {Promise<object>} the chunk summary.
 */
export async function runChunk({ root, dir, k, agent, signal, workers, evaluate }) {
  if (!Number.isSafeInteger(k) || k < 1) throw new Error('k must be a positive integer')
  const task = await readTask(root)
  const limit = await readBudgetLimit(root)
  if (limit === undefined) throw new Error(`${BUDGET_FILE} is missing: write { "limit": <candidate budget> } there first`)
  const rows = await readRows(root)
  const remaining = limit - budgetUsed(rows)
  if (remaining <= 0) throw new Error(`the budget is used up (${budgetUsed(rows)} of ${limit} candidates)`)
  const allowed = Math.min(k, remaining)

  const active = await readActive(root)
  const loaded = {}
  for (const [slot, name] of Object.entries(active.slots)) loaded[slot] = await loadStrategy(dir, slot, name)
  if (loaded.loop === undefined) throw new Error('no loop strategy is active')
  const settingsOf = strategy => ({ ...strategy.settings, ...active.settings[strategy.slot] })

  const controller = new AbortController()
  const runSignal = AbortSignal.any([signal, controller.signal])
  const builds = limiter(loaded.var === undefined ? undefined : settingsOf(loaded.var).maxConcurrent)
  const evaluations = limiter(loaded.eval === undefined ? undefined : settingsOf(loaded.eval).maxConcurrent)
  const pending = []
  const created = []
  const inFlight = new Set()
  const at = path => resolve(root, path)

  // Rows are rewritten after every change; writes run one after another.
  let saving = Promise.resolve()
  const save = () => {
    saving = saving.catch(() => undefined).then(() => writeRows(root, rows))
    return saving
  }
  // Ids and budget are checked and given out one candidate at a time.
  let allocating = Promise.resolve()
  const allocate = (job) => {
    const next = allocating.then(job)
    allocating = next.catch(() => undefined)
    return next
  }

  const track = (promise) => {
    inFlight.add(promise)
    promise.then(() => inFlight.delete(promise), () => inFlight.delete(promise))
    return promise
  }

  const dropPending = (attempt) => {
    const index = pending.indexOf(attempt)
    if (index !== -1) pending.splice(index, 1)
  }

  async function callSlot(slot, args, places) {
    const strategy = loaded[slot]
    if (strategy === undefined) throw new Error(`no strategy is active for slot "${slot}"`)
    runSignal.throwIfAborted()
    const release = places === undefined ? undefined : await places.acquire()
    try {
      return await strategy.run(makeCore(strategy), ...args)
    } finally {
      release?.()
      if (slot === 'var') dropPending(args[0])
      await save()
    }
  }

  async function select(n) {
    const strategy = loaded.sel
    if (strategy === undefined) throw new Error('no strategy is active for slot "sel"')
    runSignal.throwIfAborted()
    const core = makeCore(strategy)
    const picks = []
    if (strategy.batch) {
      const batch = await strategy.run(core, { n })
      for (const attempt of Array.isArray(batch) ? batch : [batch]) {
        if (attempt == null) continue
        pending.push(attempt)
        picks.push(attempt)
      }
    } else {
      for (let index = 0; index < n; index++) {
        const attempt = await strategy.run(core)
        if (attempt == null) break
        pending.push(attempt)
        picks.push(attempt)
      }
    }
    return picks
  }

  function createCandidate(attempt) {
    return allocate(async () => {
      runSignal.throwIfAborted()
      const used = budgetUsed(rows)
      if (used >= limit) throw new Error(`the budget is used up (${used} of ${limit} candidates)`)
      const id = await nextId(root, rows)
      const folder = `${CANDIDATES_DIR}/${id}`
      await mkdir(at(folder), { recursive: true })
      attempt.id = id
      attempt.parents ??= []
      attempt.folder = folder
      for (const [slot, name] of Object.entries(active.slots)) attempt[slot] = name
      if (active.method !== null) attempt.method = active.method
      dropPending(attempt)
      rows.push(attempt)
      created.push(attempt)
      await save()
      return { id, folder }
    })
  }

  async function spawn({ preset, directory, brief, description }) {
    runSignal.throwIfAborted()
    const { id, done } = await workers.spawn({
      preset,
      directory: at(directory),
      brief,
      description,
      parent: agent,
      signal: runSignal,
    })
    const result = await done
    return { worker: id, lastMessage: result.lastMessage, stopReason: result.stopReason }
  }

  async function runEvaluator(attempt) {
    if (typeof attempt.id !== 'string') throw new Error('runEvaluator needs a created candidate')
    const result = await evaluate(task, at(folderOf(attempt, attempt.id)), runSignal)
    const file = at(`${EVALS_DIR}/${attempt.id}.json`)
    await mkdir(dirname(file), { recursive: true })
    await writeFile(file, `${JSON.stringify(result, null, 2)}\n`)
    return result
  }

  async function evalResult(id) {
    try {
      return JSON.parse(await readFile(at(`${EVALS_DIR}/${id}.json`), 'utf8'))
    } catch (error) {
      if (error?.code === 'ENOENT') return undefined
      throw error
    }
  }

  const files = Object.freeze({
    read: path => readFile(at(path), 'utf8'),
    async write(path, text) {
      await mkdir(dirname(at(path)), { recursive: true })
      await writeFile(at(path), text)
    },
    async copy(from, to, { only } = {}) {
      if ((await stat(at(from))).isDirectory()) {
        await copyProject(at(from), at(to), only === undefined ? undefined : at(only))
        return
      }
      await mkdir(dirname(at(to)), { recursive: true })
      await copyFile(at(from), at(to))
    },
    exists: path => access(at(path)).then(() => true, () => false),
    list: path => readdir(at(path)),
  })

  function makeCore(strategy) {
    return {
      settings: settingsOf(strategy),
      task: Object.freeze({ dir: task.dir, program: task.program, statement: task.statement, settings: task.settings }),
      signal: runSignal,
      rows: () => rows,
      row: id => rows.find(row => row.id === id),
      pending: () => [...pending],
      budget: () => ({ limit, used: budgetUsed(rows), remaining: limit - budgetUsed(rows) }),
      select: n => select(n),
      variate: attempt => track(callSlot('var', [attempt], builds)),
      evaluate: attempt => track(callSlot('eval', [attempt], evaluations)),
      survive: attempts => track(callSlot('surv', [attempts])),
      slot: name => (...args) => track(callSlot(name, args)),
      strategy: (slot, name) => async (...args) => {
        const other = await loadStrategy(dir, slot, name)
        return other.run(makeCore(other), ...args)
      },
      freePlace: () => builds.free(),
      createCandidate,
      spawn,
      runEvaluator,
      evalResult,
      files,
    }
  }

  const bestBefore = best(rows)
  const started = Date.now()
  let loopResult
  let loopError
  try {
    loopResult = await loaded.loop.run(makeCore(loaded.loop), { k: allowed })
  } catch (error) {
    loopError = error
  }
  // A failed chunk stops the attempts still running; every attempt settles before the chunk ends.
  if (loopError !== undefined) controller.abort(loopError)
  while (inFlight.size > 0) await Promise.allSettled([...inFlight])
  await save()
  if (loopError !== undefined) throw loopError

  return summarize({ rows, created, bestBefore, limit, requested: k, allowed, started, loopResult })
}

function brief(row) {
  return row === undefined ? null : { id: row.id, score: row.score }
}

function summarize({ rows, created, bestBefore, limit, requested, allowed, started, loopResult }) {
  const bestAfter = best(rows)
  const used = budgetUsed(rows)
  return {
    attempts: {
      requested,
      allowed,
      created: created.length,
      valid: created.filter(isValid).length,
      broken: created.filter(isBroken).length,
    },
    budget: { limit, used, remaining: limit - used },
    seconds: Math.round((Date.now() - started) / 1000),
    best: {
      before: brief(bestBefore),
      after: brief(bestAfter),
      improved: bestAfter !== undefined && bestAfter !== bestBefore && (bestBefore === undefined || bestAfter.score > bestBefore.score),
    },
    stallCount: stallCount(rows),
    candidates: created.map(row => ({
      id: row.id,
      parents: row.parents,
      preset: row.preset ?? null,
      score: typeof row.score === 'number' ? row.score : null,
      error: row.error == null ? null : firstLine(String(row.error), 200),
      alive: row.alive === true,
      report: firstLine(row.report),
    })),
    alive: rows
      .filter(row => row.alive === true)
      .map(row => ({ id: row.id, score: typeof row.score === 'number' ? row.score : null, children: childCount(rows, row.id) })),
    ...loopResult === undefined ? {} : { loop: loopResult },
  }
}
