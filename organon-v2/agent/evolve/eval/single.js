// agent/evolve/eval/single.js: scores the candidate with the task's evaluator, one evaluation at a time
// reads: id, folder    writes: score, error
export const settings = { maxConcurrent: 1 }

export default async function evaluate(core, a) {
  const res = await core.runEvaluator(a)
  if (res.error != null) {
    a.error = res.error
  } else {
    a.score = res.score
  }
}
