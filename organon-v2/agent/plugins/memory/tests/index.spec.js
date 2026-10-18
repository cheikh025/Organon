import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { AGENT_DIR, apply } from '../src/index.js'

const REAL_AGENT_DIR = join(dirname(fileURLToPath(import.meta.url)), '..', '..', '..')

function fakeCtx(cwd, agents = []) {
  const sections = []
  const listeners = {}
  const ctx = {
    systemPrompt: { section: section => sections.push(section) },
    on: (event, listener) => { listeners[event] = listener },
    workingDirectory: { ensure: async () => cwd },
    agents: { get: id => agents.find(agent => agent.id === id) },
    logger: { warn() {} },
  }
  return { ctx, sections, listeners }
}

describe('memory plugin wiring', () => {
  it('finds the agent folder from its own location', () => {
    expect(AGENT_DIR.replace(/[\\/]+$/, '')).toBe(REAL_AGENT_DIR)
  })

  it('adds AGENTS.md as a literal system-prompt section and listens to tool results and session events', () => {
    const { ctx, sections, listeners } = fakeCtx(REAL_AGENT_DIR)
    apply(ctx, { stallFraction: 0.5 })
    expect(sections).toHaveLength(1)
    expect(sections[0]).toMatchObject({ name: 'organon:agents-md', order: 11000, interpolate: false })
    expect(sections[0].text()).toBe(readFileSync(join(REAL_AGENT_DIR, 'AGENTS.md'), 'utf8'))
    expect(Object.keys(listeners).sort()).toEqual(['session/event', 'tools/result'])
  })

  it('injects a DSH user message with the memory source as a reminder after a compaction', async () => {
    const run = mkdtempSync(join(tmpdir(), 'memory-wiring-'))
    try {
      writeFileSync(join(run, 'run.json'), JSON.stringify({ task: 'x' }))
      const injected = []
      const agent = { id: 'main', inject: message => injected.push(message) }
      const { ctx, listeners } = fakeCtx(run, [agent])
      apply(ctx)
      await listeners['session/event']({ id: 'main' }, { type: 'compaction/end', data: { compactionId: 'c1', turn: 2 } })
      expect(injected).toHaveLength(1)
      expect(injected[0]).toMatchObject({ role: 'user', source: { kind: 'memory', form: 'notice', summary: 'Memory (trigger: compaction)' } })
      expect(typeof injected[0].id).toBe('string')
      expect(injected[0].content[0].text).toMatch(/^Memory \(trigger: compaction\)/)
    } finally {
      rmSync(run, { recursive: true, force: true })
    }
  })
})
