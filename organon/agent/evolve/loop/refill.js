// agent/evolve/loop/refill.js: a new attempt each time Var has a free place
// reads: nothing    writes: nothing
export const name = 'organon-loop-refill'
export const inject = ['evolve']

export function apply(ctx, config) {
  ctx.effect(() => ctx.evolve.strategy('loop', 'refill', loop, { settings: { ...config } }))
}

export async function loop(core, { k }) {
  const running = []
  for (let i = 0; i < k; i++) {
    await core.freePlace()
    const [a] = await core.select(1)
    const attempt = (async () => {
      await core.variate(a)
      await core.evaluate(a)
      await core.survive([a])
    })()
    // Promise.all below reports a failure; this keeps it from being unhandled while the loop still waits.
    attempt.catch(() => {})
    running.push(attempt)
  }
  await Promise.all(running)
}
