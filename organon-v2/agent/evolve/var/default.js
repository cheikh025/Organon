// agent/evolve/var/default.js: copies the statement and the parents into the candidate's folder,
// writes a factual brief, runs one worker, and saves its last message as report.md
// reads: parents, preset, score, error, report    writes: id, folder, preset, worker, report
export const settings = { preset: 'mutator', maxConcurrent: 5 }

export default async function variate(core, a) {
  const { id, folder } = await core.createCandidate(a)
  const program = core.task.program
  const parents = a.parents ?? []
  await core.files.copy(core.task.statement, `${folder}/statement.md`)

  const lines = ['Task: the full statement is in ./statement.md.']
  if (parents.length === 0) {
    lines.push(`Start from: nothing; write ./${program} from scratch.`)
  } else if (parents.length === 1) {
    await copyParent(core, parents[0], folder)
    lines.push(`Start from: ./${program}, candidate ${parents[0]}, ${resultOf(core.row(parents[0]))}.`)
    lines.push('Feedback on it: ./parent_feedback.txt. Its worker\'s report: ./parent_report.md.')
  } else {
    lines.push('Start from these candidates, each in its own folder with its program, feedback and report:')
    for (const [i, parent] of parents.entries()) {
      await copyParent(core, parent, `${folder}/parent_${i + 1}`)
      lines.push(`- ./parent_${i + 1}/: candidate ${parent}, ${resultOf(core.row(parent))}.`)
    }
  }
  lines.push(`Rules: work only in this folder; write your program to ./${program}.`)

  const preset = a.preset ?? core.settings.preset ?? 'mutator'
  const { worker, lastMessage } = await core.spawn({
    preset,
    directory: folder,
    brief: lines.join('\n'),
    description: `${preset} from ${parents.join(', ') || 'scratch'}`,
  })
  const report = lastMessage.trim() || 'No closing message.'
  await core.files.write(`${folder}/report.md`, `${report}\n`)

  a.id = id
  a.folder = folder
  a.preset = preset
  a.worker = worker
  a.report = report
}

/** Copy one parent's program, feedback and report into a folder of the new candidate. */
async function copyParent(core, id, into) {
  const row = core.row(id)
  const program = core.task.program
  await core.files.copy(`${row?.folder ?? `search/candidates/${id}`}/${program}`, `${into}/${program}`)
  await core.files.write(`${into}/parent_feedback.txt`, feedbackOf(row, await core.evalResult(id)))
  await core.files.write(`${into}/parent_report.md`, `${row?.report ?? 'No report: this is the task\'s starting program.'}\n`)
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
