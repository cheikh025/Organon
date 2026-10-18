/**
 * When a chunk starts a long stall: no new best for a fraction of the
 * candidate budget. A stall fires once; the next one can fire only after a
 * new best.
 *
 * @module @organon/memory/cues
 */

/**
 * Read one `evolve_run` chunk summary against the run's stall state.
 * @param {object} summary - the chunk summary: `stallCount`, `budget.limit`, `best.improved`.
 * @param {{ stallArmed: boolean, lastStallCount: number }} state
 * @param {{ stallFraction: number }} settings
 * @returns {{ fire: boolean, armed: boolean, stallCount: number }} whether to fire, and the state after this chunk.
 */
export function detectStall(summary, state, settings) {
  const stallCount = Number(summary?.stallCount) || 0
  const limit = Number(summary?.budget?.limit)
  // stallCount drops back only when a new best appears
  const armed = state.stallArmed || summary?.best?.improved === true || stallCount < state.lastStallCount
  if (!(limit > 0)) return { fire: false, armed, stallCount }
  const fire = armed && stallCount >= Math.max(1, Math.ceil(limit * settings.stallFraction))
  return { fire, armed: armed && !fire, stallCount }
}
