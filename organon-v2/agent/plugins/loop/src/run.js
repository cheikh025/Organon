/**
 * The run folder's inputs, written by the main agent at task start:
 * `run.json` (`task`: the task folder, absolute or relative to the run
 * folder) and `search/budget.json` (`limit`: the candidate budget). The task
 * folder holds the fixed evaluator and `task.json`; the run's own `task/`
 * holds the copy the run works on.
 *
 * @module @organon/loop/run
 */

import { readFile } from 'node:fs/promises'
import { join, resolve } from 'node:path'

export const RUN_FILE = 'run.json'
export const BUDGET_FILE = 'search/budget.json'

async function readJson(file) {
  try {
    return JSON.parse(await readFile(file, 'utf8'))
  } catch (error) {
    if (error?.code === 'ENOENT') return undefined
    throw new Error(`${file} is not valid JSON: ${error.message}`)
  }
}

/**
 * The task this run works on.
 * @param {string} root - the run folder.
 * @returns {Promise<{ dir: string, settings: object, program: string, statement: string }>}
 */
export async function readTask(root) {
  const run = await readJson(join(root, RUN_FILE))
  if (typeof run?.task !== 'string' || run.task === '') {
    throw new Error(`${RUN_FILE} in ${root} must name the task folder in "task"`)
  }
  const dir = resolve(root, run.task)
  const settings = await readJson(join(dir, 'task.json'))
  if (settings === undefined) throw new Error(`the task folder ${dir} has no task.json`)
  return { dir, settings, program: settings.program, statement: 'task/statement.md' }
}

/**
 * The candidate budget, or undefined before `search/budget.json` exists.
 * @param {string} root - the run folder.
 * @returns {Promise<number | undefined>}
 */
export async function readBudgetLimit(root) {
  const budget = await readJson(join(root, BUDGET_FILE))
  if (budget === undefined) return undefined
  if (!Number.isSafeInteger(budget.limit) || budget.limit < 0) {
    throw new Error(`${BUDGET_FILE} must hold { "limit": <non-negative integer> }`)
  }
  return budget.limit
}
