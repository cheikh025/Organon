import { spawnSync } from 'node:child_process'
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import { RUNNER } from '../src/evaluator.js'

let base
afterEach(() => { if (base) rmSync(base, { recursive: true, force: true }) })

/** A task whose evaluator.py body is given, plus a program to score. */
function task(evaluatorBody, settings = {}) {
  base = mkdtempSync(join(tmpdir(), 'runner-'))
  const dir = join(base, 'task')
  mkdirSync(join(dir, 'evaluator'), { recursive: true })
  writeFileSync(join(dir, 'task.json'), JSON.stringify({ program: 'solution.py', timeout: 30, max_retries: 0, ...settings }))
  writeFileSync(join(dir, 'evaluator', 'evaluator.py'), evaluatorBody)
  const program = join(base, 'solution.py')
  writeFileSync(program, 'print(1)\n')
  return { dir, program }
}

function run({ dir, program }) {
  const started = Date.now()
  const done = spawnSync('python', ['-B', RUNNER, dir, program], { encoding: 'utf8', timeout: 60_000 })
  return {
    status: done.status,
    seconds: (Date.now() - started) / 1000,
    stderr: done.stderr,
    lines: done.stdout.trim().split(/\r?\n/),
    result: JSON.parse(done.stdout.trim().split(/\r?\n/).pop()),
  }
}

describe('run_evaluator.py', () => {
  it('scores combined_score and keeps the stdout to one JSON line', () => {
    const out = run(task('def evaluate(path):\n    print("noise")\n    return {"combined_score": 7.5, "note": "ok"}\n'))
    expect(out.status).toBe(0)
    expect(out.lines).toHaveLength(1)
    expect(out.result).toEqual({ score: 7.5, error: null, metrics: { combined_score: 7.5, note: 'ok' } })
    expect(out.stderr).toContain('noise')
  })

  it('reports the evaluator\'s error and ignores an empty one', () => {
    expect(run(task('def evaluate(path):\n    return {"combined_score": 0.0, "error": "boom"}\n')).result)
      .toMatchObject({ score: null, error: 'boom' })
    expect(run(task('def evaluate(path):\n    return {"combined_score": 3, "error": ""}\n')).result)
      .toMatchObject({ score: 3, error: null })
  })

  it('uses the mean of the numeric metrics when combined_score is missing', () => {
    expect(run(task('def evaluate(path):\n    return {"a": 2, "b": 4, "flag": True, "name": "x"}\n')).result)
      .toMatchObject({ score: 3, error: null })
  })

  it('retries an exception and scores the next attempt', () => {
    const body = [
      'import os',
      'def evaluate(path):',
      '    marker = os.path.join(os.path.dirname(os.path.abspath(__file__)), "tried")',
      '    if not os.path.exists(marker):',
      '        open(marker, "w").close()',
      '        raise RuntimeError("first attempt fails")',
      '    return {"combined_score": 5}',
      '',
    ].join('\n')
    const out = run(task(body, { max_retries: 1 }))
    expect(out.result).toMatchObject({ score: 5, error: null })
    expect(out.stderr).toContain('attempt 1 of 2')
  })

  it('reports an exception on the last attempt as the error', () => {
    const out = run(task('def evaluate(path):\n    raise ValueError("bad program")\n'))
    expect(out.result.score).toBeNull()
    expect(out.result.error).toContain('bad program')
  })

  it('ends a timed-out evaluation without waiting for it', () => {
    const out = run(task('import time\ndef evaluate(path):\n    time.sleep(20)\n    return {"combined_score": 1}\n', { timeout: 1 }))
    expect(out.result).toMatchObject({ score: null, error: 'evaluation timed out after 1 s' })
    expect(out.seconds).toBeLessThan(15)
  })

  it('rejects a result that is not a dict, and a non-finite score', () => {
    expect(run(task('def evaluate(path):\n    return 42\n')).result.error).toContain('not a dict')
    const nan = run(task('def evaluate(path):\n    return {"combined_score": float("nan")}\n')).result
    expect(nan).toMatchObject({ score: null, error: 'the score is not finite: nan', metrics: { combined_score: 'nan' } })
  })

  it('evaluates the program where it is', () => {
    const out = run(task('def evaluate(path):\n    return {"combined_score": 1, "path": path}\n'))
    expect(out.result.metrics.path.endsWith('solution.py')).toBe(true)
  })
})
