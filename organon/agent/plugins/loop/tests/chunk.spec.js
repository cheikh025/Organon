import { cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { afterEach, describe, expect, it } from 'vitest'
import { DEFAULT_SLOTS, writeActive } from '../src/active.js'
import { limiter, runChunk } from '../src/chunk.js'
import { runEvaluator } from '../src/evaluator.js'
import { readRows } from '../src/rows.js'
import { fakeSubprocess, writeEvolve } from './helpers.js'

const HERE = dirname(fileURLToPath(import.meta.url))
const FIXTURE = join(HERE, 'fixtures', 'task')
const L0 = join(HERE, '..', '..', '..', 'evolve')
const agent = { id: 'main', session: { id: 'main-session' } }

let base
afterEach(() => { if (base) rmSync(base, { recursive: true, force: true }) })

/** A run folder at task start: run.json, budget, the task copy and the baseline c000000. */
function makeRun({ limit = 10, extraRows = [] } = {}) {
  base = mkdtempSync(join(tmpdir(), 'chunk-'))
  // as at task start: the run lives inside the task folder, and c000000 is a copy of the task
  const task = join(base, 'task')
  cpSync(FIXTURE, task, { recursive: true })
  const root = join(task, '.organon', 'runs', '2026-10-18_01')
  cpSync(FIXTURE, join(root, 'search', 'candidates', 'c000000'), { recursive: true })
  mkdirSync(join(root, 'search', 'evals'), { recursive: true })
  writeFileSync(join(root, 'run.json'), JSON.stringify({ task: '../../..' }))
  writeFileSync(join(root, 'search', 'budget.json'), JSON.stringify({ limit }))
  writeFileSync(join(root, 'search', 'candidates', 'c000000', 'solution.py'), 'print(10)\n')
  writeFileSync(join(root, 'search', 'evals', 'c000000.json'), JSON.stringify({ score: 10, error: null, metrics: { combined_score: 10 } }))
  const rows = [{ id: 'c000000', parents: [], score: 10, alive: true }, ...extraRows]
  writeFileSync(join(root, 'search', 'candidates.jsonl'), rows.map(row => JSON.stringify(row)).join('\n') + '\n')
  return root
}

/** A strategies folder: L0 plus extra files. */
function makeEvolve(files = {}) {
  const dir = join(base, 'evolve')
  cpSync(L0, dir, { recursive: true })
  return writeEvolve(dir, files)
}

const sleep = (ms, signal) => new Promise((resolveSleep, rejectSleep) => {
  if (signal?.aborted) {
    rejectSleep(new Error('aborted'))
    return
  }
  const timer = setTimeout(resolveSleep, ms)
  signal?.addEventListener('abort', () => {
    clearTimeout(timer)
    rejectSleep(new Error('aborted'))
  }, { once: true })
})

/** A stand-in worker plugin: each worker raises the number its program prints by one. */
function fakeWorkers({ delay = 10, write = current => `print(${current + 1})\n` } = {}) {
  let running = 0
  const state = { calls: [], peak: 0 }
  state.spawn = async (options) => {
    state.calls.push(options)
    const id = `w${state.calls.length}`
    running += 1
    state.peak = Math.max(state.peak, running)
    const done = (async () => {
      try {
        await sleep(delay, options.signal)
        const file = join(options.directory, 'solution.py')
        const current = existsSync(file) ? Number(/-?\d+/.exec(readFileSync(file, 'utf8'))[0]) : 0
        writeFileSync(file, write(current))
        return { id, lastMessage: `Raised the number to ${current + 1}.\nSecond line.`, stopReason: 'completed' }
      } catch {
        return { id, lastMessage: '', stopReason: 'aborted' }
      } finally {
        running -= 1
      }
    })()
    return { id, done }
  }
  return state
}

/** A stand-in evaluator: the score is the number the program prints. */
function fakeEvaluate({ delay = 5 } = {}) {
  let running = 0
  const evaluate = async (_task, folder, signal) => {
    running += 1
    evaluate.peak = Math.max(evaluate.peak, running)
    try {
      await sleep(delay, signal)
      const match = /print\((-?\d+)\)/.exec(readFileSync(join(folder, 'solution.py'), 'utf8'))
      return match
        ? { score: Number(match[1]), error: null, metrics: { combined_score: Number(match[1]) } }
        : { score: null, error: 'printed no number', metrics: { combined_score: 0 }, log: 'Traceback: no number' }
    } finally {
      running -= 1
    }
  }
  evaluate.peak = 0
  return evaluate
}

const chunk = (root, dir, options) => runChunk({
  root, dir, agent, signal: new AbortController().signal, k: 4, workers: fakeWorkers(), evaluate: fakeEvaluate(), ...options,
})

describe('runChunk with the L0 strategies', () => {
  it('builds, scores and keeps each candidate, and stamps its row', async () => {
    const root = makeRun()
    const workers = fakeWorkers()
    const summary = await chunk(root, L0, { k: 4, workers })

    expect(summary.attempts).toEqual({ requested: 4, allowed: 4, created: 4, valid: 4, broken: 0 })
    expect(summary.budget).toEqual({ limit: 10, used: 4, remaining: 6 })
    expect(summary.best.improved).toBe(true)

    const rows = await readRows(root)
    expect(rows.map(row => row.id)).toEqual(['c000000', 'c000001', 'c000002', 'c000003', 'c000004'])
    for (const row of rows.slice(1)) {
      expect(row).toMatchObject({
        ...DEFAULT_SLOTS,
        method: 'population-evolution',
        folder: `search/candidates/${row.id}`,
        preset: 'mutator',
        alive: true,
      })
      expect(row.parents).toHaveLength(1)
      expect(row.worker).toMatch(/^w\d$/)
      expect(row.report).toMatch(/^Raised the number to \d+\.\nSecond line\.$/)
      expect(typeof row.score).toBe('number')
      const folder = join(root, row.folder)
      for (const file of ['statement.md', 'task.json', 'solution.py', 'evaluator/evaluator.py', 'parent_feedback.txt', 'parent_report.md', 'report.md']) {
        expect(existsSync(join(folder, file)), file).toBe(true)
      }
      expect(existsSync(join(root, 'search', 'evals', `${row.id}.json`))).toBe(true)
    }

    const first = workers.calls[0]
    expect(first).toMatchObject({ preset: 'mutator', description: 'mutator from c000000', parent: agent })
    expect(first.directory).toBe(join(root, 'search', 'candidates', 'c000001'))
    expect(first.message).toBe([
      'Your task is described in ./statement.md.',
      'The program to improve is ./solution.py.',
      '',
      'Starting point: candidate c000000.',
      'Its evaluation is in ./parent_feedback.txt.',
      "Its worker's final response is in ./parent_report.md.",
      'The evaluator is available in ./evaluator/.',
      '',
      'Work inside this folder. Changes to files from the original task are',
      'evaluated and passed to descendants; additional files stay with this candidate.',
    ].join('\n'))
    const c1 = join(root, 'search', 'candidates', 'c000001')
    expect(readFileSync(join(c1, 'parent_feedback.txt'), 'utf8')).toMatch(/^Score: 10\n\nEvaluator result:\n/)
  })

  it('keeps builds within Var\'s maxConcurrent and evaluations within Eval\'s', async () => {
    const root = makeRun({ limit: 20 })
    const workers = fakeWorkers({ delay: 40 })
    const evaluate = fakeEvaluate({ delay: 10 })
    await chunk(root, L0, { k: 8, workers, evaluate })
    expect(workers.peak).toBe(5)
    expect(evaluate.peak).toBe(1)

    await writeActive(root, { method: 'population-evolution', slots: { ...DEFAULT_SLOTS }, settings: { var: { maxConcurrent: 2 } } })
    const limited = fakeWorkers({ delay: 40 })
    await chunk(root, L0, { k: 4, workers: limited })
    expect(limited.peak).toBe(2)
  })

  it('caps the chunk at the remaining budget, then refuses', async () => {
    const root = makeRun({ limit: 3 })
    const summary = await chunk(root, L0, { k: 10 })
    expect(summary.attempts).toMatchObject({ requested: 10, allowed: 3, created: 3 })
    await expect(chunk(root, L0, { k: 1 })).rejects.toThrow(/budget is used up \(3 of 3/)
  })

  it('records an evaluation error on the row and keeps it out of the alive pool', async () => {
    const root = makeRun()
    const summary = await chunk(root, L0, { k: 1, workers: fakeWorkers({ write: () => 'print("oops")\n' }) })
    expect(summary.attempts).toMatchObject({ valid: 0, broken: 1 })
    const [, broken] = await readRows(root)
    expect(broken).toMatchObject({ id: 'c000001', error: 'printed no number', alive: false })
    expect(broken).not.toHaveProperty('score')
  })

  it('scores candidates with the real evaluator runner', async () => {
    const root = makeRun()
    const subprocess = fakeSubprocess()
    const evaluate = (task, folder, signal) => runEvaluator({ subprocess, python: 'python', task, folder, signal })
    const summary = await chunk(root, L0, { k: 2, evaluate })
    expect(summary.attempts).toMatchObject({ created: 2, valid: 2 })
    const rows = await readRows(root)
    expect(rows.slice(1).map(row => row.score)).toEqual([11, 11])
    const saved = JSON.parse(readFileSync(join(root, 'search', 'evals', 'c000001.json'), 'utf8'))
    expect(saved).toMatchObject({ score: 11, error: null, metrics: { combined_score: 11, printed: '11' } })
    expect(saved.log).toContain('fixture evaluator')
  })

  it('needs the run inputs written at task start', async () => {
    const root = makeRun()
    rmSync(join(root, 'search', 'budget.json'))
    await expect(chunk(root, L0, {})).rejects.toThrow(/budget.json is missing/)
    rmSync(join(root, 'run.json'))
    await expect(chunk(root, L0, {})).rejects.toThrow(/run.json/)
  })
})

describe('runChunk with other strategies', () => {
  it('stops the running attempts when the loop fails, and saves them', async () => {
    const root = makeRun()
    const dir = makeEvolve({
      'loop/fail.js': [
        'export default async function loop(core) {',
        '  const [a] = await core.select(1)',
        '  const [b] = await core.select(1)',
        '  core.variate(a).catch(() => {})',
        '  core.variate(b).catch(() => {})',
        '  while (globalThis.__spawned() < 2) await new Promise(r => setTimeout(r, 5))',
        '  throw new Error("loop broke")',
        '}',
      ].join('\n'),
    })
    await writeActive(root, { method: null, slots: { ...DEFAULT_SLOTS, loop: 'fail' }, settings: {} })
    const workers = fakeWorkers({ delay: 5000 })
    globalThis.__spawned = () => workers.calls.length
    const started = Date.now()
    await expect(chunk(root, dir, { workers })).rejects.toThrow('loop broke')
    expect(Date.now() - started).toBeLessThan(3000)
    expect(workers.calls.every(call => call.signal.aborted)).toBe(true)
    const rows = await readRows(root)
    expect(rows.slice(1).map(row => [row.id, row.report])).toEqual([['c000001', 'No closing message.'], ['c000002', 'No closing message.']])
  })

  it('shows earlier picks as pending to a one-pick Sel, and supports a batch Sel', async () => {
    const root = makeRun()
    const dir = makeEvolve({
      'sel/spy.js': 'export default async function select(core) { globalThis.__seen.push(core.pending().length); return { parents: ["c000000"] } }\n',
      'sel/many.js': 'export const batch = true\nexport default async function select(core, { n }) { return Array.from({ length: n }, () => ({ parents: ["c000000"], picked: "batch" })) }\n',
      'loop/pick.js': 'export default async function loop(core, { k }) { const picks = await core.select(k); await Promise.all(picks.map(a => core.variate(a))) }\n',
    })
    globalThis.__seen = []
    await writeActive(root, { method: null, slots: { ...DEFAULT_SLOTS, loop: 'pick', sel: 'spy' }, settings: {} })
    await chunk(root, dir, { k: 3 })
    expect(globalThis.__seen).toEqual([0, 1, 2])

    await writeActive(root, { method: null, slots: { ...DEFAULT_SLOTS, loop: 'pick', sel: 'many' }, settings: {} })
    await chunk(root, dir, { k: 2 })
    expect((await readRows(root)).filter(row => row.picked === 'batch').map(row => row.sel)).toEqual(['many', 'many'])
  })

  it('calls an added slot by name and stamps it on the row', async () => {
    const root = makeRun()
    const dir = makeEvolve({
      'critic/tag.js': 'export default async function critic(core, a) { a.reviewed = true }\n',
      'loop/with-critic.js': 'export default async function loop(core) { const [a] = await core.select(1); await core.variate(a); await core.slot("critic")(a) }\n',
    })
    await writeActive(root, { method: null, slots: { ...DEFAULT_SLOTS, loop: 'with-critic', critic: 'tag' }, settings: {} })
    await chunk(root, dir, { k: 1 })
    expect((await readRows(root))[1]).toMatchObject({ id: 'c000001', critic: 'tag', reviewed: true })
  })

  it('lets a strategy call another strategy of its slot', async () => {
    const root = makeRun()
    const dir = makeEvolve({
      'sel/portfolio.js': 'export const settings = { uniformProb: 0 }\nexport default async function select(core) { return core.strategy("sel", "rank")() }\n',
    })
    await writeActive(root, { method: null, slots: { ...DEFAULT_SLOTS, sel: 'portfolio' }, settings: {} })
    await chunk(root, dir, { k: 2 })
    expect((await readRows(root)).slice(1).map(row => [row.sel, row.parents])).toEqual([['portfolio', ['c000000']], ['portfolio', ['c000000']]])
  })

  it('lists the folder\'s contents for no parent and for two parents, passing on only the task\'s files', async () => {
    const root = makeRun({
      extraRows: [{ id: 'c000001', parents: ['c000000'], score: 12, alive: true, folder: 'search/candidates/c000001', report: 'Made it 12.' }],
    })
    const c1 = join(root, 'search', 'candidates', 'c000001')
    cpSync(join(root, 'search', 'candidates', 'c000000'), c1, { recursive: true })
    writeFileSync(join(c1, 'solution.py'), 'print(12)\n')
    writeFileSync(join(c1, 'sweep.py'), 'a leftover of its worker\n')
    writeFileSync(join(c1, 'report.md'), 'Made it 12.\n')
    const dir = makeEvolve({
      'sel/fixed.js': 'export default async function select(core) { return { parents: core.settings.parents } }\n',
    })
    const workers = fakeWorkers()
    await writeActive(root, { method: null, slots: { ...DEFAULT_SLOTS, sel: 'fixed' }, settings: { sel: { parents: [] } } })
    await chunk(root, dir, { k: 1, workers })
    expect(workers.calls[0].message).toContain('Starting point: the original task files.')
    expect(workers.calls[0].message).not.toContain('parent_feedback.txt')
    expect(existsSync(join(root, 'search', 'candidates', 'c000002', 'task.json'))).toBe(true)
    expect(existsSync(join(root, 'search', 'candidates', 'c000002', '.organon'))).toBe(false)

    await writeActive(root, { method: null, slots: { ...DEFAULT_SLOTS, sel: 'fixed' }, settings: { sel: { parents: ['c000001', 'c000000'] } } })
    await chunk(root, dir, { k: 1, workers })
    const message = workers.calls[1].message
    expect(message).toContain('Starting point: candidate c000001.')
    expect(message).toContain('Additional starting point: candidate c000000. Its files, evaluation and worker response are in ./parent_2/.')
    const folder = join(root, 'search', 'candidates', 'c000003')
    expect(existsSync(join(folder, 'sweep.py'))).toBe(false)
    expect(readFileSync(join(folder, 'parent_report.md'), 'utf8')).toBe('Made it 12.\n')
    expect(existsSync(join(folder, 'parent_2', 'parent_feedback.txt'))).toBe(true)
    expect(readFileSync(join(folder, 'parent_2', 'solution.py'), 'utf8')).toBe('print(10)\n')
  })
})

describe('limiter', () => {
  it('lets at most max callers hold a place, and wakes freePlace waiters', async () => {
    const places = limiter(2)
    const first = await places.acquire()
    const second = await places.acquire()
    let thirdIn = false
    const third = places.acquire().then((release) => { thirdIn = true; return release })
    let free = false
    const freeWait = places.free().then(() => { free = true })
    await sleep(5)
    expect([thirdIn, free, places.running]).toEqual([false, false, 2])
    first()
    await sleep(5)
    expect([thirdIn, places.running]).toEqual([true, 2])
    second()
    await freeWait
    expect(free).toBe(true)
    ;(await third)()
    expect(places.running).toBe(0)
    expect(limiter(undefined).running).toBe(0)
  })
})
