import { mkdirSync, mkdtempSync, readFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { catalog } from '../src/strategies.js'
import { EVOLVE, L0_NAMES, registerL0, writeEvolve } from './helpers.js'

let dir
beforeEach(() => {
  dir = writeEvolve(mkdtempSync(join(tmpdir(), 'evolve-')), {
    'package.json': { name: '@organon/evolve' },
    'cordis.patch.yml': '- insert: []\n',
    'sel/rank.js': '',
    'sel/batch.js': '',
    'sel/notes.md': '',
    'loop/refill.js': '',
  })
  mkdirSync(join(dir, 'node_modules', 'x'), { recursive: true })
  mkdirSync(join(dir, '.cache'))
})
afterEach(() => rmSync(dir, { recursive: true, force: true }))

describe('strategy files', () => {
  it('lists every strategy file on disk by slot', async () => {
    expect(await catalog(dir)).toEqual({ loop: ['refill'], sel: ['batch', 'rank'] })
    expect(await catalog(join(dir, 'missing'))).toEqual({})
  })

  it('L₀ plugins register one strategy per slot, their row config over the file\'s defaults', async () => {
    const slots = (await registerL0({ config: { surv: { k: 4 } } })).active()
    expect(Object.fromEntries(Object.entries(slots).map(([slot, strategy]) => [slot, strategy.name]))).toEqual(L0_NAMES)
    expect(slots.sel.settings).toEqual({ pressure: 1 })
    expect(slots.var.settings).toEqual({ preset: 'mutator', maxConcurrent: 5 })
    expect(slots.eval.settings).toEqual({ maxConcurrent: 1 })
    expect(slots.surv.settings).toEqual({ k: 4 })
    expect(slots.sel.batch).toBe(false)
  })

  it('the bundle patch has one row per L₀ plugin, in the population-evolution group', () => {
    const patch = readFileSync(join(EVOLVE, 'cordis.patch.yml'), 'utf8')
    expect(patch).toContain('id: population-evolution')
    for (const [slot, name] of Object.entries(L0_NAMES)) expect(patch).toContain(`name: '@organon/evolve/${slot}/${name}'`)
  })
})
