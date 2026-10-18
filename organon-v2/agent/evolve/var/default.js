// agent/evolve/var/default.js: copies the parent's project (the task's files, as its worker left them),
// its fitness and its worker's report into the candidate's folder, writes a factual brief, runs one
// worker, and saves its last message as report.md
// reads: parents, preset, score, error, report    writes: id, folder, preset, worker, report
export const settings = { preset: 'mutator', maxConcurrent: 5 }

export default async function variate(core, a) {
  const { id, folder } = await core.createCandidate(a)
  const program = core.task.program
  const parents = a.parents ?? []

  const lines = ['Task: the full statement is in ./statement.md.']
  if (parents.length === 0) {
    await core.files.copy('task', folder, { only: 'task' })
    lines.push(`Start from: the task's files as given; the program is ./${program}.`)
  } else {
    await copyParent(core, parents[0], folder)
    lines.push(`Start from: the files here, from candidate ${parents[0]}, ${resultOf(core.row(parents[0]))}.`)
    lines.push('Feedback on it: ./parent_feedback.txt. Its worker\'s report: ./parent_report.md.')
    for (const [i, parent] of parents.slice(1).entries()) {
      await copyParent(core, parent, `${folder}/parent_${i + 2}`)
      lines.push(`Also candidate ${parent}, ${resultOf(core.row(parent))}: its files, feedback and report are in ./parent_${i + 2}/.`)
    }
  }
  lines.push(
    'Only the files that were part of the task are evaluated and passed on; anything else you create stays with this candidate.',
    `Rules: work only in this folder; write your program to ./${program}.`,
  )

  const preset = a.preset ?? core.settings.preset ?? 'mutator'
  const { worker, lastMessage } = await core.spawn({
    preset,
    directory: folder,
    brief: lines.join('\n'),
    description: `${preset} from ${parents.join(', ') || 'the task'}`,
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
  await core.files.copy(row?.folder ?? `search/candidates/${id}`, into, { only: 'task' })
  await core.files.write(`${into}/parent_feedback.txt`, feedbackOf(row, await core.evalResult(id)))
  await core.files.write(`${into}/parent_report.md`, `${row?.report ?? 'No report: these are the task\'s files as given.'}\n`)
}

function resultOf(row) {
  if (row?.error != null) return 'which failed (see its feedback)'
  return typeof row?.score === 'number' ? `score ${row.score}` : 'not scored'
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
