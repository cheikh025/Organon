// agent/evolve/eval/single.js: scores the candidate with the task's evaluator, one evaluation at a time
// reads: id, folder    writes: score, error
export const name = 'organon-eval-single'
export const inject = ['evolve']

export function apply(ctx, config) {
  ctx.effect(() => ctx.evolve.strategy('eval', 'single', evaluate, { settings: { maxConcurrent: 1, ...config } }))
}

export async function evaluate(core, a) {
  const res = await core.runEvaluator(a)
  if (res.error != null) {
    a.error = res.error
  } else {
    a.score = res.score
  }
}
