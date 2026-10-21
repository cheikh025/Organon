/**
 * The `evolve_status` report: budget, archive progress, the strategies
 * enabled in each slot and what is available on disk. It reads only; it
 * never runs anything.
 *
 * @module @organon/loop/status
 */

import { BASELINE_ID, budgetUsed, readRows } from './rows.js'
import { readBudgetLimit } from './run.js'
import { best, counts, stallCount } from './stats.js'
import { catalog } from './strategies.js'

/**
 * @param {object} options
 * @param {string} options.root - the run folder.
 * @param {string} options.dir - the strategies folder.
 * @param {import('./registry.js').Strategies} options.strategies - the registered strategies.
 * @param {string[]} options.presets - ids of the agent presets DSH knows.
 * @param {string} options.runner - how to run the evaluator by hand.
 * @returns {Promise<object>}
 */
export async function status({ root, dir, strategies, presets, runner }) {
  const rows = await readRows(root)
  const limit = await readBudgetLimit(root)
  const baseline = rows.find(row => row.id === BASELINE_ID)
  const top = best(rows)

  const slots = {}
  for (const [slot, entries] of Object.entries(strategies.bySlot())) {
    slots[slot] = entries.length === 1
      ? { strategy: entries[0].name, settings: entries[0].settings }
      : { strategies: entries.map(entry => entry.name), error: 'more than one strategy is enabled in this slot' }
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
    active: slots,
    available: { files: await catalog(dir), presets },
    evaluatorRunner: runner,
  }
}
