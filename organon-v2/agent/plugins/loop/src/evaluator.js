/**
 * Running a task's fixed evaluator on one program, through run_evaluator.py
 * and DSH's subprocess service. With `sandbox: true` in task.json the runner
 * runs inside DSH's sandbox, where only a temporary folder is writable.
 *
 * @module @organon/loop/evaluator
 */

import { mkdtemp, realpath, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

/** The runner script; the main agent calls the same file to score the baseline. */
export const RUNNER = fileURLToPath(new URL('./run_evaluator.py', import.meta.url))

const STDOUT_MAX_BYTES = 1024 * 1024
const STDERR_MAX_BYTES = 64 * 1024
const LOG_TAIL_CHARS = 4000
const GRACE_MS = 2000
// The runner enforces the task's timeout itself; this only ends a runner that outlives all its attempts.
const RUNNER_MARGIN_MS = 60_000

/**
 * @typedef {object} EvaluatorResult
 * @property {number | null} score - the candidate's score; null when it failed.
 * @property {string | null} error - why it failed; null when it was scored.
 * @property {object} [metrics] - the evaluator's full result.
 * @property {string} [log] - the end of what the evaluator printed.
 */

/**
 * Score one program with the task's evaluator. A failure of the candidate or
 * of the evaluator process is returned as `error`; only cancellation throws.
 * @param {object} options
 * @param {object} options.subprocess - DSH's subprocess service.
 * @param {object} [options.sandbox] - DSH's sandbox service; required for sandboxed tasks.
 * @param {string} options.python - the Python command (bare name or absolute path).
 * @param {{ dir: string, settings: object }} options.task - the task folder and its task.json.
 * @param {string} options.program - absolute path of the program to score.
 * @param {string} [options.sessionId] - the session the evaluation runs for.
 * @param {AbortSignal} options.signal - cancels the evaluation.
 * @returns {Promise<EvaluatorResult>}
 */
export async function runEvaluator({ subprocess, sandbox, python, task, program, sessionId, signal }) {
  const { settings } = task
  const executable = await subprocess.resolveExecutable(python, undefined, signal)
  const scratch = await realpath(await mkdtemp(join(tmpdir(), 'organon-eval-')))
  try {
    let argv = [executable, '-B', RUNNER, task.dir, program]
    if (settings.sandbox === true) {
      if (sandbox === undefined) throw new Error('this task asks for a sandboxed evaluator, and DSH\'s sandbox service is missing')
      const policy = { mode: 'workspace-write', workspaceRoot: scratch, ...sessionId === undefined ? {} : { sessionId } }
      argv = (await sandbox.confine(argv, policy, signal)).argv
    }

    const limitMs = Number(settings.timeout) * (Number(settings.max_retries ?? 0) + 1) * 1000 + RUNNER_MARGIN_MS
    const deadline = AbortSignal.timeout(limitMs)
    const handle = subprocess.spawn({
      argv,
      cwd: join(task.dir, 'evaluator'),
      env: { ...settings.env, TMPDIR: scratch },
      stdio: { stdin: 'ignore', stdout: { maxBytes: STDOUT_MAX_BYTES }, stderr: { maxBytes: STDERR_MAX_BYTES } },
      graceMs: GRACE_MS,
      signal: AbortSignal.any([signal, deadline]),
    })
    const exit = await handle.done
    signal.throwIfAborted()

    const stdout = handle.collected.stdout.readFrom(0).text.trim()
    const log = handle.collected.stderr.readFrom(0).text.trim().slice(-LOG_TAIL_CHARS)
    const line = stdout.split(/\r?\n/).pop()
    if (deadline.aborted) {
      return { score: null, error: `the evaluator process ran past its ${Math.round(limitMs / 1000)} s limit and was stopped`, log }
    }
    if (exit.exitCode !== 0 || line === undefined || line === '') {
      return { score: null, error: `the evaluator process failed (exit ${String(exit.exitCode ?? exit.signal)})`, log }
    }
    try {
      return { ...JSON.parse(line), log }
    } catch {
      return { score: null, error: 'the evaluator process printed no result line', log }
    }
  } finally {
    await rm(scratch, { recursive: true, force: true })
  }
}
