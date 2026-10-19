import { mkdtempSync, readFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { ACTIVE_FILE, applyUse, DEFAULT_SLOTS, readActive, writeActive } from '../src/active.js'
import { stub, writeEvolve } from './helpers.js'

let base
let dir
let root
beforeEach(() => {
  base = mkdtempSync(join(tmpdir(), 'active-'))
  root = join(base, 'run')
  dir = writeEvolve(join(base, 'evolve'), {
    'loop/refill.js': stub(), 'loop/generational.js': stub(),
    'sel/rank.js': stub(), 'sel/mcts-uct.js': stub(),
    'var/default.js': stub(), 'var/with-dead-ends.js': stub(),
    'eval/single.js': stub(),
    'surv/top-k.js': stub(), 'surv/mcts-backprop.js': stub(),
    'critic/review.js': stub(),
    'methods/population-evolution.json': { loop: 'refill', sel: 'rank', eval: 'single', surv: 'top-k' },
    'methods/mcts.json': { sel: 'mcts-uct', surv: 'mcts-backprop' },
  })
})
afterEach(() => rmSync(base, { recursive: true, force: true }))

describe('active setup', () => {
  it('starts as L0, population evolution', async () => {
    expect(await readActive(root)).toEqual({ method: 'population-evolution', slots: { ...DEFAULT_SLOTS }, settings: {} })
  })

  it('switches a method, keeping the slots it does not name', async () => {
    const next = await applyUse(await readActive(root), { method: 'mcts' }, dir)
    expect(next.method).toBe('mcts')
    expect(next.slots).toEqual({ loop: 'refill', sel: 'mcts-uct', var: 'default', eval: 'single', surv: 'mcts-backprop' })
  })

  it('keeps the method named while only slots outside it change', async () => {
    const next = await applyUse(await readActive(root), { var: 'with-dead-ends' }, dir)
    expect(next).toMatchObject({ method: 'population-evolution', slots: { var: 'with-dead-ends' } })
  })

  it('drops the method name once a slot it defines is changed', async () => {
    const next = await applyUse(await readActive(root), { method: 'mcts', sel: 'rank' }, dir)
    expect(next.method).toBeNull()
    expect(next.slots.sel).toBe('rank')
  })

  it('applies the preset shortcut and merges settings per slot', async () => {
    let active = await applyUse(await readActive(root), { preset: 'refine', settings: { surv: { k: 20 } } }, dir)
    active = await applyUse(active, { settings: { surv: { extra: true }, var: { maxConcurrent: 2 } } }, dir)
    expect(active.settings).toEqual({ var: { preset: 'refine', maxConcurrent: 2 }, surv: { k: 20, extra: true } })
  })

  it('removes an override with null, so the strategy default applies again', async () => {
    let active = await applyUse(await readActive(root), { preset: 'refine', settings: { var: { maxConcurrent: 2, brief: 'x' }, surv: { k: 20 } } }, dir)
    active = await applyUse(active, { settings: { var: { maxConcurrent: null } } }, dir)
    expect(active.settings).toEqual({ var: { preset: 'refine', brief: 'x' }, surv: { k: 20 } })
    active = await applyUse(active, { preset: null, settings: { surv: null } }, dir)
    expect(active.settings).toEqual({ var: { brief: 'x' } })
  })

  it('adds a slot by name and removes it with null', async () => {
    let active = await applyUse(await readActive(root), { critic: 'review' }, dir)
    expect(active.slots.critic).toBe('review')
    active = await applyUse(active, { critic: null }, dir)
    expect(active.slots).not.toHaveProperty('critic')
  })

  it('refuses a strategy or method that does not exist', async () => {
    await expect(applyUse(await readActive(root), { sel: 'nope' }, dir)).rejects.toThrow(/no sel strategy "nope"/)
    await expect(applyUse(await readActive(root), { method: 'nope' }, dir)).rejects.toThrow(/no search method "nope"/)
  })

  it('persists the setup in the run folder', async () => {
    const next = await applyUse(await readActive(root), { loop: 'generational', settings: { loop: { wave: 4 } } }, dir)
    await writeActive(root, next)
    expect(JSON.parse(readFileSync(join(root, ACTIVE_FILE), 'utf8'))).toEqual(next)
    expect(await readActive(root)).toEqual(next)
  })
})
