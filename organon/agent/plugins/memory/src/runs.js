/**
 * The run the main agent is in, and the plugin's record of its reminders
 * there: `<run>/memory-deliveries.jsonl`, one line per reminder. The per-run
 * state (whether a stall may fire, whether the run has ended) is rebuilt
 * from that file, so a restart does not repeat a reminder.
 *
 * @module @organon/memory/runs
 */

import { existsSync } from 'node:fs'
import { appendFile, readFile } from 'node:fs/promises'
import { dirname, join, resolve } from 'node:path'

export const LOG_FILE = 'memory-deliveries.jsonl'

/**
 * The run folder holding `dir`: the nearest folder at or above it with a `run.json`.
 * @param {string | undefined} dir
 * @returns {string | undefined}
 */
export function findRunRoot(dir) {
  if (typeof dir !== 'string' || dir === '') return undefined
  let current = resolve(dir)
  for (;;) {
    if (existsSync(join(current, 'run.json'))) return current
    const parent = dirname(current)
    if (parent === current) return undefined
    current = parent
  }
}

/**
 * @typedef {object} RunState
 * @property {boolean} stallArmed - a long stall may fire (no stall fired since the last new best).
 * @property {number} lastStallCount - the stall count of the last chunk seen.
 * @property {boolean} ended - the task-end reminder was sent.
 */

/** @returns {RunState} */
export function emptyState() {
  return { stallArmed: true, lastStallCount: 0, ended: false }
}

/**
 * Apply one reminder to the state.
 * @param {RunState} state
 * @param {{ cue: string, stallCount?: number }} entry
 */
export function record(state, entry) {
  if (entry.cue === 'stall') {
    state.stallArmed = false
    if (typeof entry.stallCount === 'number') state.lastStallCount = entry.stallCount
  }
  if (entry.cue === 'task-end') state.ended = true
}

/**
 * Rebuild a run's state from its log.
 * @param {string} root - the run folder.
 * @returns {Promise<RunState>}
 */
export async function loadState(root) {
  const state = emptyState()
  let text = ''
  try {
    text = await readFile(join(root, LOG_FILE), 'utf8')
  } catch (error) {
    if (error?.code !== 'ENOENT') throw error
  }
  for (const line of text.split(/\r?\n/)) {
    if (line.trim() === '') continue
    try {
      record(state, JSON.parse(line))
    } catch {
      // a broken line is skipped
    }
  }
  return state
}

/**
 * Append one reminder to the run's log.
 * @param {string} root - the run folder.
 * @param {object} entry
 */
export async function appendLog(root, entry) {
  await appendFile(join(root, LOG_FILE), `${JSON.stringify(entry)}\n`)
}
