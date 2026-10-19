import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { apply, renderChunk } from '../src/index.js'

const AGENT_DIR = join(dirname(fileURLToPath(import.meta.url)), '..', '..', '..')
let root

beforeEach(() => {
  root = mkdtempSync(join(tmpdir(), 'loop-tools-'))
  mkdirSync(join(root, 'search'))
  writeFileSync(join(root, 'search', 'budget.json'), JSON.stringify({ limit: 100 }))
  writeFileSync(join(root, 'search', 'candidates.jsonl'), [
    JSON.stringify({ id: 'c000000', parents: [], score: 10, alive: true }),
    JSON.stringify({ id: 'c000001', parents: ['c000000'], score: 14, alive: true, preset: 'mutator' }),
    JSON.stringify({ id: 'c000002', parents: ['c000001'], error: 'boom', alive: false }),
  ].join('\n') + '\n')
})
afterEach(() => {
  rmSync(root, { recursive: true, force: true })
})

function tools(config) {
  const registered = {}
  apply({
    tools: { register: tool => { registered[tool.name] = tool } },
    workingDirectory: { ensure: async () => root },
    get: name => (name === 'agentPresets' ? { list: async () => [{ id: 'organon' }, { id: 'mutator' }] } : undefined),
  }, config)
  return registered
}

const exec = { agent: { id: 'main', session: { id: 's' } }, signal: new AbortController().signal }

describe('loop tools', () => {
  it('finds agent/evolve/ from the plugin\'s own location', async () => {
    const { evolveDir } = await import('../src/strategies.js')
    expect(evolveDir().replace(/[\\/]+$/, '')).toBe(join(AGENT_DIR, 'evolve'))
  })

  it('registers evolve_status, evolve_use and evolve_run', () => {
    expect(Object.keys(tools())).toEqual(['evolve_status', 'evolve_use', 'evolve_run'])
  })

  it('evolve_status reports the budget, the archive and the active setup', async () => {
    const report = await tools({ python: 'py' }).evolve_status.execute({}, exec)
    expect(report.budget).toEqual({ limit: 100, used: 2, remaining: 98 })
    expect(report.baseline).toEqual({ id: 'c000000', score: 10, error: null })
    expect(report.best).toEqual({ id: 'c000001', score: 14, deltaFromBaseline: 4, parents: ['c000000'], preset: 'mutator' })
    expect(report.counts).toEqual({ total: 3, valid: 2, broken: 1, unscored: 0, alive: 2 })
    expect(report.stallCount).toBe(1)
    expect(report.active.method).toBe('population-evolution')
    expect(report.active.slots.var).toEqual({ strategy: 'default', settings: { preset: 'mutator', maxConcurrent: 5, brief: '' } })
    expect(report.available.slots.sel).toContain('rank')
    expect(report.available.methods).toEqual(['population-evolution'])
    expect(report.available.presets).toEqual(['organon', 'mutator'])
    expect(report.evaluatorRunner).toMatch(/^py -B ".*run_evaluator\.py"/)
  })

  it('evolve_use writes the run\'s active setup', async () => {
    const next = await tools().evolve_use.execute({ preset: 'refine', settings: { surv: { k: 4 } } }, exec)
    expect(next.settings).toEqual({ var: { preset: 'refine' }, surv: { k: 4 } })
    expect(JSON.parse(readFileSync(join(root, 'search', 'active.json'), 'utf8'))).toEqual(next)
  })

  it('evolve_run refuses a chunk without a task', async () => {
    await expect(tools().evolve_run.execute({ k: 1 }, exec)).rejects.toThrow(/run.json/)
  })
})

describe('renderChunk', () => {
  it('shows the budget, the best score, one line per candidate and the alive pool', () => {
    const [{ text }] = renderChunk({
      attempts: { requested: 2, allowed: 2, created: 2, valid: 1, broken: 1 },
      budget: { limit: 10, used: 3, remaining: 7 },
      seconds: 42,
      best: { before: { id: 'c000000', score: 10 }, after: { id: 'c000003', score: 12 }, improved: true },
      stallCount: 1,
      candidates: [
        { id: 'c000003', parents: ['c000000'], preset: 'mutator', score: 12, error: null, alive: true, report: 'Faster IO.' },
        { id: 'c000004', parents: ['c000000'], preset: 'mutator', score: null, error: 'timed out', alive: false, report: '' },
      ],
      alive: [{ id: 'c000003', score: 12, children: 0 }, { id: 'c000000', score: 10, children: 2 }],
    })
    expect(text).toBe([
      'Chunk: 2 new candidates (1 valid, 1 broken) in 42 s; budget 3 of 10 used, 7 left.',
      'Best: c000003 12, up from c000000 10.',
      'c000003  from c000000  mutator  score 12  alive  | Faster IO.',
      'c000004  from c000000  mutator  error: timed out  -',
      'Alive: c000003 12 (0 children), c000000 10 (2 children)',
    ].join('\n'))
  })
})
