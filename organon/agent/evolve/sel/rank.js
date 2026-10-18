// agent/evolve/sel/rank.js: picks one alive parent, more likely the higher it ranks
// reads: alive, score    writes: parents
// pressure 0 picks uniformly; higher values favour the best candidates more.
export const settings = { pressure: 1.0 }

export default async function select(core) {
  const pool = core.rows()
    .filter(r => r.alive === true && typeof r.score === 'number')
    .sort((a, b) => b.score - a.score)
  if (pool.length === 0) throw new Error('sel/rank: no alive, scored candidate to start from')
  const weights = pool.map((_, i) => (pool.length - i) ** core.settings.pressure)
  let x = Math.random() * weights.reduce((sum, w) => sum + w, 0)
  for (let i = 0; i < pool.length; i++) {
    x -= weights[i]
    if (x < 0) return { parents: [pool[i].id] }
  }
  return { parents: [pool[pool.length - 1].id] }
}
