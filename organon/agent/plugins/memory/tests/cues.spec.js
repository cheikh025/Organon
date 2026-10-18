import { describe, expect, it } from 'vitest'
import { detectStall } from '../src/cues.js'

const settings = { stallFraction: 0.25 }
const summary = (stallCount, extra = {}) => ({ stallCount, budget: { limit: 100, used: 50, remaining: 50 }, best: { improved: false }, ...extra })
const fresh = () => ({ stallArmed: true, lastStallCount: 0 })

describe('detectStall', () => {
  it('fires once no new best has appeared for a quarter of the budget', () => {
    expect(detectStall(summary(24), fresh(), settings)).toEqual({ fire: false, armed: true, stallCount: 24 })
    expect(detectStall(summary(25), fresh(), settings)).toEqual({ fire: true, armed: false, stallCount: 25 })
  })

  it('does not fire again while the same stall goes on', () => {
    expect(detectStall(summary(60), { stallArmed: false, lastStallCount: 25 }, settings).fire).toBe(false)
  })

  it('fires again only after a new best, seen as a lower stall count or an improved best', () => {
    const afterFiring = { stallArmed: false, lastStallCount: 30 }
    const reset = detectStall(summary(4), afterFiring, settings)
    expect(reset).toEqual({ fire: false, armed: true, stallCount: 4 })
    expect(detectStall(summary(26), { stallArmed: reset.armed, lastStallCount: 4 }, settings).fire).toBe(true)
    // a new best early in a long chunk, then a whole quarter of the budget without one
    expect(detectStall(summary(40, { best: { improved: true } }), { stallArmed: false, lastStallCount: 30 }, settings).fire).toBe(true)
  })

  it('scales with the budget, and needs one', () => {
    expect(detectStall(summary(3, { budget: { limit: 10 } }), fresh(), settings).fire).toBe(true)
    expect(detectStall(summary(999, { budget: {} }), fresh(), settings).fire).toBe(false)
  })
})
