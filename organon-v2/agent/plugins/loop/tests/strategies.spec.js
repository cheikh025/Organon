import { mkdtempSync, rmSync, utimesSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { catalog, loadMethod, loadStrategy } from '../src/strategies.js'
import { stub, writeEvolve } from './helpers.js'

let dir
beforeEach(() => {
  dir = writeEvolve(mkdtempSync(join(tmpdir(), 'evolve-')), {
    'sel/rank.js': stub('return "rank v1"', 'export const settings = { pressure: 1 }'),
    'sel/batch.js': stub('return []', 'export const batch = true'),
    'sel/broken.js': 'export const settings = {}\n',
    'loop/refill.js': stub(),
    'methods/population-evolution.json': { loop: 'refill', sel: 'rank' },
    'methods/bad.json': '[1, 2]',
  })
})
afterEach(() => rmSync(dir, { recursive: true, force: true }))

describe('strategies', () => {
  it('loads the default function, its settings and the batch flag', async () => {
    const rank = await loadStrategy(dir, 'sel', 'rank')
    expect(rank).toMatchObject({ slot: 'sel', name: 'rank', settings: { pressure: 1 }, batch: false })
    expect(await rank.run()).toBe('rank v1')
    expect((await loadStrategy(dir, 'sel', 'batch')).batch).toBe(true)
  })

  it('loads an edited file afresh under the same name', async () => {
    const file = join(dir, 'sel', 'rank.js')
    writeFileSync(file, stub('return "rank v2"'))
    utimesSync(file, new Date(), new Date(Date.now() + 5000))
    expect(await (await loadStrategy(dir, 'sel', 'rank')).run()).toBe('rank v2')
  })

  it('explains a missing file and a file without a default function', async () => {
    await expect(loadStrategy(dir, 'sel', 'nope')).rejects.toThrow(/no sel strategy "nope"/)
    await expect(loadStrategy(dir, 'sel', 'broken')).rejects.toThrow(/default export/)
  })

  it('reads methods and refuses one that is not a slot map', async () => {
    expect(await loadMethod(dir, 'population-evolution')).toEqual({ loop: 'refill', sel: 'rank' })
    await expect(loadMethod(dir, 'bad')).rejects.toThrow(/map slot names/)
  })

  it('lists every strategy and method on disk', async () => {
    expect(await catalog(dir)).toEqual({
      slots: { loop: ['refill'], sel: ['batch', 'broken', 'rank'] },
      methods: ['bad', 'population-evolution'],
    })
    expect(await catalog(join(dir, 'missing'))).toEqual({ slots: {}, methods: [] })
  })
})
