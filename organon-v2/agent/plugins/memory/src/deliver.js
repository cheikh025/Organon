/**
 * The reminders the main agent reads. The plugin never picks memory items:
 * matching a lesson's condition to the situation is the agent's judgment,
 * so each reminder only says where to look.
 *
 * @module @organon/memory/deliver
 */

import { join } from 'node:path'

/**
 * At a long stall: the memory that may help.
 * @param {object} options
 * @param {number} options.stallCount - evaluations since the last new best.
 * @param {string} options.agentDir - the agent folder.
 * @returns {string}
 */
export function stallMessage({ stallCount, agentDir }) {
  return `Memory (trigger: stall). No new best for ${stallCount} evaluations. Your memory may help: the Lessons section of AGENTS.md, `
    + `the lessons in ${join(agentDir, 'memory', 'lessons')}, and this benchmark's overview in ${join(agentDir, 'memory', 'overviews')}.`
}

/**
 * After a compaction: what is gone from context, and where the run's notes are.
 * @returns {string}
 */
export function compactionMessage() {
  return 'Memory (trigger: compaction). Your context was compacted: what you read from memory earlier is gone from it, while AGENTS.md is still there. '
    + 'Your plan and the lessons you applied are in scratch/plan.md, your decisions in scratch/decisions.md. Re-read what you need.'
}

/**
 * When the run ends: what may need updating for later tasks.
 * @returns {string}
 */
export function endMessage() {
  return 'Memory (trigger: task-end). The run is ending. Consider what later tasks should keep or change: your memory '
    + '(the history entry, lessons, facts, AGENTS.md; see the memory skill) and your capabilities (skills, plugins, presets, strategies; see managing-capabilities).'
}
