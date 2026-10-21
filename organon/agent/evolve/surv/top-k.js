// agent/evolve/surv/top-k.js: keeps the k best valid candidates alive
// reads: score, error    writes: alive
export const name = 'organon-surv-top-k'
export const inject = ['evolve']

export function apply(ctx, config) {
  ctx.effect(() => ctx.evolve.strategy('surv', 'top-k', survive, { settings: { k: 10, ...config } }))
}

export async function survive(core, _attempts) {
  const valid = core.rows()
    .filter(r => r.error == null && typeof r.score === 'number')
    .sort((a, b) => b.score - a.score)

  const keepIds = new Set(valid.slice(0, core.settings.k).map(r => r.id))
  for (const row of core.rows()) {
    row.alive = keepIds.has(row.id)
  }
}
