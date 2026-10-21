// agent/evolve/var/default.js: copies the parent's project (the task's files, as its worker left them),
// its fitness and its worker's report into the candidate's folder, sends the worker the folder's contents
// (what is in it, and the rules) as its first message, and saves the worker's last message as report.md
// reads: parents, preset, score, error, report    writes: id, folder, preset, worker, report
// timeLimit: minutes each worker has (null: no limit)
export const name = 'organon-var-default'
export const inject = ['evolve']

export function apply(ctx, config) {
  ctx.effect(() => ctx.evolve.strategy('var', 'default', variate, {
    settings: { preset: 'mutator', maxConcurrent: 5, timeLimit: 15, ...config },
  }))
}

export async function variate(core, a) {
  const { id, folder } = await core.createCandidate(a)
  const program = core.task.program
  const parents = a.parents ?? []
  const preset = a.preset ?? core.settings.preset ?? 'mutator'

  const lines = [
    'Your task is described in ./statement.md.',
    `The program to improve is ./${program}.`,
    '',
  ]
  if (parents.length === 0) {
    await core.files.copy(core.task.dir, folder)
    lines.push('Starting point: the original task files.')
  } else {
    await copyParent(core, parents[0], folder)
    lines.push(
      `Starting point: candidate ${parents[0]}.`,
      'Its evaluation is in ./parent_feedback.txt.',
      "Its worker's final response is in ./parent_report.md.",
    )
    for (const [i, parent] of parents.slice(1).entries()) {
      await copyParent(core, parent, `${folder}/parent_${i + 2}`)
      lines.push(`Additional starting point: candidate ${parent}. Its files, evaluation and worker response are in ./parent_${i + 2}/.`)
    }
  }
  if (await core.files.exists(`${folder}/evaluator`)) lines.push('The evaluator is available in ./evaluator/.')
  lines.push(
    '',
    'Work inside this folder. Changes to files from the original task are',
    'evaluated and passed to descendants; additional files stay with this candidate.',
  )

  const { worker, lastMessage } = await core.spawn({
    preset,
    directory: folder,
    message: lines.join('\n'),
    description: `${preset} from ${parents.join(', ') || 'the task'}`,
    timeLimit: core.settings.timeLimit,
  })
  const report = lastMessage.trim() || 'No closing message.'
  await core.files.write(`${folder}/report.md`, `${report}\n`)

  a.id = id
  a.folder = folder
  a.preset = preset
  a.worker = worker
  a.report = report
}

/** Copy one parent's project (only the task's paths), its fitness and its worker's report into a folder. */
async function copyParent(core, id, into) {
  const row = core.row(id)
  await core.files.copy(row?.folder ?? `search/candidates/${id}`, into, { only: core.task.dir })
  await core.files.write(`${into}/parent_feedback.txt`, feedbackOf(row, await core.evalResult(id)))
  await core.files.write(`${into}/parent_report.md`, `${row?.report ?? 'No report: these are the task\'s files as given.'}\n`)
}

/** The parent's score or error, the evaluator's full result, and the end of its log when it failed. */
function feedbackOf(row, result) {
  const lines = [row?.error != null ? `Error: ${row.error}` : `Score: ${row?.score ?? 'none'}`]
  if (result?.metrics !== undefined) lines.push('', 'Evaluator result:', JSON.stringify(result.metrics, null, 2))
  if (row?.error != null && typeof result?.log === 'string' && result.log !== '') {
    lines.push('', 'End of the evaluator log:', result.log)
  }
  return `${lines.join('\n')}\n`
}
