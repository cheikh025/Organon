import { describe, expect, it } from 'vitest'
import { Strategies } from '../src/registry.js'

const run = async () => undefined

describe('the evolve service', () => {
  it('registers a strategy with its settings and batch flag, until its disposer runs', () => {
    const strategies = new Strategies()
    const settings = { pressure: 2 }
    const dispose = strategies.strategy('sel', 'rank', run, { settings, batch: true })
    settings.pressure = 3
    expect(strategies.active()).toEqual({ sel: { slot: 'sel', name: 'rank', run, settings: { pressure: 2 }, batch: true } })
    dispose()
    dispose()
    expect(strategies.active()).toEqual({})
  })

  it('gives each slot its one strategy, and refuses a slot with two', () => {
    const strategies = new Strategies()
    strategies.strategy('loop', 'refill', run)
    strategies.strategy('sel', 'rank', run)
    const dispose = strategies.strategy('sel', 'tournament', run)
    expect(strategies.bySlot().sel.map(entry => entry.name)).toEqual(['rank', 'tournament'])
    expect(() => strategies.active()).toThrow(/slot "sel" has 2 enabled strategies \(rank, tournament\)/)
    dispose()
    expect(strategies.active().sel.name).toBe('rank')
    expect(strategies.active().loop.settings).toEqual({})
  })

  it('refuses a strategy without a slot, a name or a function, or with settings that are not an object', () => {
    const strategies = new Strategies()
    expect(() => strategies.strategy('', 'rank', run)).toThrow(/non-empty slot/)
    expect(() => strategies.strategy('sel', undefined, run)).toThrow(/non-empty name/)
    expect(() => strategies.strategy('sel', 'rank', {})).toThrow(/must be a function/)
    expect(() => strategies.strategy('sel', 'rank', run, { settings: [] })).toThrow(/settings must be an object/)
  })
})
