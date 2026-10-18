import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it, vi } from 'vitest'
import { runEvaluator } from '../src/evaluator.js'
import { fakeSubprocess } from './helpers.js'

const FIXTURE = join(dirname(fileURLToPath(import.meta.url)), 'fixtures', 'task')
const fixture = { dir: FIXTURE, settings: JSON.parse(readFileSync(join(FIXTURE, 'task.json'), 'utf8')) }

describe('runEvaluator', () => {
  it('runs the task\'s evaluator on the program and returns its result', async () => {
    const subprocess = fakeSubprocess()
    const result = await runEvaluator({
      subprocess,
      python: 'python',
      task: fixture,
      folder: FIXTURE,
      signal: new AbortController().signal,
    })
    expect(result).toMatchObject({ score: 10, error: null, metrics: { combined_score: 10, printed: '10' } })
    expect(result.log).toContain('fixture evaluator: running the program')
    expect(subprocess.spawned[0].cwd).toBe(join(FIXTURE, 'evaluator'))
    expect(subprocess.spawned[0].env.TMPDIR).toBeTruthy()
  })

  it('confines a sandboxed task to a temporary folder', async () => {
    const subprocess = fakeSubprocess()
    const sandbox = { confine: vi.fn(async argv => ({ argv: [...argv] })) }
    await runEvaluator({
      subprocess,
      sandbox,
      python: 'python',
      task: { ...fixture, settings: { ...fixture.settings, sandbox: true } },
      folder: FIXTURE,
      sessionId: 'main-session',
      signal: new AbortController().signal,
    })
    const [, policy] = sandbox.confine.mock.calls[0]
    expect(policy).toMatchObject({ mode: 'workspace-write', sessionId: 'main-session' })
    expect(policy.workspaceRoot).toBe(subprocess.spawned[0].env.TMPDIR)
  })

  it('refuses a sandboxed task when DSH\'s sandbox service is missing', async () => {
    await expect(runEvaluator({
      subprocess: fakeSubprocess(),
      python: 'python',
      task: { ...fixture, settings: { ...fixture.settings, sandbox: true } },
      folder: FIXTURE,
      signal: new AbortController().signal,
    })).rejects.toThrow(/sandbox service is missing/)
  })

  it('reports a failed evaluator process as the candidate\'s error', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'broken-task-'))
    try {
      mkdirSync(join(dir, 'evaluator'))
      writeFileSync(join(dir, 'task.json'), JSON.stringify(fixture.settings))
      writeFileSync(join(dir, 'evaluator', 'evaluator.py'), 'def evaluate(:\n')
      const result = await runEvaluator({
        subprocess: fakeSubprocess(),
        python: 'python',
        task: { dir, settings: fixture.settings },
        folder: FIXTURE,
        signal: new AbortController().signal,
      })
      expect(result.score).toBeNull()
      expect(result.error).toMatch(/the evaluator process failed \(exit 1\)/)
      expect(result.log).toContain('SyntaxError')
    } finally {
      rmSync(dir, { recursive: true, force: true })
    }
  })

  it('throws when the evaluation is cancelled', async () => {
    const controller = new AbortController()
    const pending = runEvaluator({
      subprocess: fakeSubprocess(),
      python: 'python',
      task: fixture,
      folder: FIXTURE,
      signal: controller.signal,
    })
    controller.abort()
    await expect(pending).rejects.toThrow()
  })
})
