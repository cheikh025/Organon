/**
 * The `evolve_status` report: budget, archive progress, the active setup and
 * what is available on disk. It reads only; it never runs anything.
 *
 * @module @organon/loop/status
 */

import { readActive } from './active.js'
import { BASELINE_ID, budgetUsed, readRows } from './rows.js'
import { readBudgetLimit } from './run.js'
import { best, counts, stallCount } from './stats.js'
import { catalog, loadStrategy } from './strategies.js'

/**
 * @param {object} options
 * @param {string} options.root - the run folder.
 * @param {string} options.dir - the strategies folder.
 * @param {string[]} options.presets - ids of the agent presets DSH knows.
 * @param {string} options.runner - how to run the evaluator by hand.
 * @returns {Promise<object>}
 */
export async function status({ root, dir, presets, runner }) {
  const rows = await readRows(root)
  const limit = await readBudgetLimit(root)
  const active = await readActive(root)
  const baseline = rows.find(row => row.id === BASELINE_ID)
  const top = best(rows)

  const slots = {}
  for (const [slot, name] of Object.entries(active.slots)) {
    try {
      const strategy = await loadStrategy(dir, slot, name)
      slots[slot] = { strategy: name, settings: { ...strategy.settings, ...active.settings[slot] } }
    } catch (error) {
      slots[slot] = { strategy: name, error: error.message }
    }
  }

  return {
    budget: limit === undefined ? null : { limit, used: budgetUsed(rows), remaining: limit - budgetUsed(rows) },
    baseline: baseline === undefined ? null : { id: baseline.id, score: baseline.score ?? null, error: baseline.error ?? null },
    best: top === undefined ? null : {
      id: top.id,
      score: top.score,
      deltaFromBaseline: typeof baseline?.score === 'number' ? top.score - baseline.score : null,
      parents: top.parents ?? [],
      preset: top.preset ?? null,
    },
    counts: counts(rows),
    stallCount: stallCount(rows),
    active: { method: active.method, slots },
    available: { ...await catalog(dir), presets },
    evaluatorRunner: runner,
  }
}
