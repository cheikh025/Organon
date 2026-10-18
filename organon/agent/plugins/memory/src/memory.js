/**
 * The memory plugin's behaviour, apart from DSH wiring: `AGENTS.md` for the
 * system prompt, the reminders at a long stall, after a compaction and when
 * the run ends, and a log of every memory file the agent reads or writes, so
 * task end can count each item's use.
 *
 * @module @organon/memory/memory
 */

import { readFileSync } from 'node:fs'
import { isAbsolute, join, relative, resolve, sep } from 'node:path'
import { detectStall } from './cues.js'
import { compactionMessage, endMessage, stallMessage } from './deliver.js'
import { appendLog, findRunRoot, loadState, record } from './runs.js'

/** File tools whose use of a memory file is logged, and how. */
const MEMORY_USES = Object.freeze({ read: 'read', write: 'write', edit: 'write' })

/** Starting values; the Organon preset's row may override them, and so may the agent. */
export const DEFAULTS = Object.freeze({ stallFraction: 0.25 })

/**
 * Settings from the preset row's config, keeping only valid values.
 * @param {object} [config]
 * @returns {{ stallFraction: number }}
 */
export function settingsFrom(config) {
  const settings = { ...DEFAULTS }
  if (typeof config?.stallFraction === 'number' && config.stallFraction > 0 && config.stallFraction <= 1) settings.stallFraction = config.stallFraction
  return settings
}

/** Whether `run.json` says the run is over. */
function runIsOver(file) {
  try {
    const status = JSON.parse(readFileSync(file, 'utf8')).status
    return status === 'done' || status === 'stopped'
  } catch {
    return false
  }
}

/**
 * @param {object} options
 * @param {string} options.agentDir - the agent folder, holding `AGENTS.md` and `memory/`.
 * @param {{ stallFraction: number }} options.settings
 * @param {{ ensure(agent: object): Promise<string> }} options.workingDirectory - DSH's working-directory service.
 * @param {{ get(id: string): object | undefined }} options.agents - DSH's agent registry.
 * @param {(text: string, cue: string) => object} options.createMessage - builds the injected message.
 * @param {{ warn?(message: string): void }} [options.logger]
 */
export function createMemory({ agentDir, settings, workingDirectory, agents, createMessage, logger }) {
  const agentsFile = join(agentDir, 'AGENTS.md')
  const memoryDir = join(agentDir, 'memory')
  const states = new Map()
  let queue = Promise.resolve()

  async function stateFor(root) {
    if (!states.has(root)) states.set(root, await loadState(root))
    return states.get(root)
  }

  async function remind(agent, root, state, entry, text) {
    record(state, entry)
    await appendLog(root, entry)
    agent.inject(createMessage(text, entry.cue))
  }

  async function endRun(agent, root, state) {
    if (state.ended) return
    await remind(agent, root, state, { time: new Date().toISOString(), cue: 'task-end' }, endMessage())
  }

  async function afterChunk(agent, summary) {
    const root = findRunRoot(await workingDirectory.ensure(agent))
    if (root === undefined) return
    const state = await stateFor(root)
    if (summary?.budget?.remaining === 0) return endRun(agent, root, state)
    const stall = detectStall(summary, state, settings)
    state.stallArmed = stall.armed
    state.lastStallCount = stall.stallCount
    if (!stall.fire) return
    const entry = { time: new Date().toISOString(), cue: 'stall', stallCount: stall.stallCount }
    await remind(agent, root, state, entry, stallMessage({ stallCount: stall.stallCount, agentDir }))
  }

  async function afterWrite(agent, filePath) {
    const cwd = await workingDirectory.ensure(agent)
    const root = findRunRoot(cwd)
    if (root === undefined) return
    const runFile = join(root, 'run.json')
    if (relative(runFile, resolve(cwd, filePath)) !== '' || !runIsOver(runFile)) return
    await endRun(agent, root, await stateFor(root))
  }

  /** Log a read or write of a memory file, so task end can count each item's use. */
  async function afterMemoryUse(agent, use, filePath) {
    const cwd = await workingDirectory.ensure(agent)
    const root = findRunRoot(cwd)
    if (root === undefined) return
    const item = relative(memoryDir, resolve(cwd, filePath))
    if (item === '' || item.startsWith('..') || isAbsolute(item)) return
    await appendLog(root, { time: new Date().toISOString(), use, item: item.split(sep).join('/') })
  }

  async function afterCompaction(agent) {
    const root = findRunRoot(await workingDirectory.ensure(agent))
    if (root === undefined) return
    await remind(agent, root, await stateFor(root), { time: new Date().toISOString(), cue: 'compaction' }, compactionMessage())
  }

  /** Handle events one after another; a failure is logged, never thrown into DSH. */
  function enqueue(task) {
    queue = queue.then(task).catch((error) => {
      logger?.warn?.(`organon-memory: ${error instanceof Error ? error.message : String(error)}`)
    })
    return queue
  }

  return {
    /** The current `AGENTS.md`, or nothing when it does not exist. */
    agentsText() {
      try {
        return readFileSync(agentsFile, 'utf8')
      } catch {
        return ''
      }
    },

    /**
     * React to a tool call: a chunk (`evolve_run`) may start a long stall or
     * use up the budget; a write to `run.json` may end the run; a read, write
     * or edit of a memory file is logged.
     * @returns {Promise<void>}
     */
    onToolResult(exec, result) {
      if (exec.agent === undefined || result.isError) return queue
      if (exec.name === 'evolve_run') return enqueue(() => afterChunk(exec.agent, result.value))
      const filePath = exec.arguments?.file_path ?? exec.arguments?.path
      if (typeof filePath !== 'string') return queue
      if ((exec.name === 'write' || exec.name === 'edit') && /run\.json$/i.test(filePath)) {
        return enqueue(() => afterWrite(exec.agent, filePath))
      }
      if (MEMORY_USES[exec.name] !== undefined) {
        return enqueue(() => afterMemoryUse(exec.agent, MEMORY_USES[exec.name], filePath))
      }
      return queue
    },

    /**
     * React to a session event: a finished compaction gets a reminder.
     * @returns {Promise<void>}
     */
    onSessionEvent(session, event) {
      if (event.type !== 'compaction/end' || event.data?.error !== undefined) return queue
      const agent = agents.get(session.id)
      if (agent === undefined) return queue
      return enqueue(() => afterCompaction(agent))
    },
  }
}
