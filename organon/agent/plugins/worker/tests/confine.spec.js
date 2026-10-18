import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { confine, DENIED_TOOLS, workerGuard, WORKER_CONTEXT } from '../src/confine.js'
import { canonical } from '../src/paths.js'

let root
afterEach(() => { if (root) rmSync(root, { recursive: true, force: true }) })

function guard() {
  root = canonical(mkdtempSync(join(tmpdir(), 'worker-guard-')))
  return workerGuard(root)
}

describe('workerGuard', () => {
  it('allows file tools inside the folder, relative or absolute', () => {
    const check = guard()
    expect(check({ name: 'read', arguments: { file_path: 'solution.cpp' } })).toBeUndefined()
    expect(check({ name: 'write', arguments: { file_path: join(root, 'out', 'a.txt') } })).toBeUndefined()
    expect(check({ name: 'grep', arguments: { pattern: 'x' } })).toBeUndefined()
    expect(check({ name: 'glob', arguments: { pattern: 'src/**/*.js', path: '.' } })).toBeUndefined()
  })

  it('refuses file paths outside the folder', () => {
    const check = guard()
    expect(check({ name: 'read', arguments: { file_path: '../c000002/solution.cpp' } })).toMatch(/outside your folder/)
    expect(check({ name: 'edit', arguments: { file_path: join(root, '..', 'x') } })).toMatch(/outside your folder/)
    expect(check({ name: 'grep', arguments: { pattern: 'x', path: '..' } })).toMatch(/outside your folder/)
  })

  it('refuses glob patterns that climb out or are absolute', () => {
    const check = guard()
    expect(check({ name: 'glob', arguments: { pattern: '../**/*' } })).toMatch(/reaches outside/)
    expect(check({ name: 'glob', arguments: { pattern: join(root, '..', '*') } })).toMatch(/reaches outside/)
  })

  it('refuses delegation and host-changing tools by name', () => {
    const check = guard()
    for (const name of ['subagent', 'send_message', 'plugin_manager', 'spawn_worker', 'working_directory']) {
      expect(DENIED_TOOLS.has(name)).toBe(true)
      expect(check({ name, arguments: {} })).toMatch(/not available to workers/)
    }
  })

  it('does not check shell commands', () => {
    const check = guard()
    expect(check({ name: 'bash', arguments: { command: 'cat ../../tasks/x' } })).toBeUndefined()
    expect(check({ name: 'pwsh', arguments: { command: 'Get-Content ..\\x' } })).toBeUndefined()
  })
})

describe('confine', () => {
  function fakeChild({ globalTools, presetTools, approval = true }) {
    const appended = []
    const restrictions = []
    const guards = []
    const contexts = []
    const child = { session: { append: (type, data) => appended.push({ type, data }) } }
    const childCtx = {
      get: name => (name === 'approval' && approval ? {} : undefined),
      tools: {
        schemas: scope => (scope === undefined ? globalTools : [...globalTools, ...presetTools]).map(name => ({ name })),
        restrict: filter => restrictions.push(filter),
        guard: g => guards.push(g),
      },
      systemPrompt: {
        getContextOrder: key => (key === 'SUBAGENT_DELEGATION' ? 120 : 0),
        context: c => contexts.push(c),
      },
    }
    const presets = { mount: vi.fn(async () => ({ id: 'mutator' })) }
    return { child, childCtx, presets, appended, restrictions, guards, contexts }
  }

  it('mounts the preset, records workspace-write and never-approve, and keeps only preset tools', async () => {
    const f = fakeChild({ globalTools: ['working_directory', 'plugin_market'], presetTools: ['read', 'write', 'pwsh'] })
    await confine(f.childCtx, f.child, { root: 'C:/run/c1', preset: 'mutator', presets: f.presets })

    expect(f.presets.mount).toHaveBeenCalledWith(f.childCtx, 'mutator')
    expect(f.appended).toEqual([
      { type: 'agent-preset/selected', data: { agentPreset: 'mutator' } },
      { type: 'sandbox/mode', data: { mode: 'workspace-write', source: 'delegation' } },
      { type: 'approval/policy', data: { policy: 'never', source: 'delegation' } },
    ])
    expect(f.restrictions).toEqual([{ allow: ['read', 'write', 'pwsh'] }])
    expect(f.guards).toHaveLength(1)
    expect(f.contexts).toEqual([{ name: 'worker:delegation', order: 120, text: WORKER_CONTEXT }])
  })

  it('skips the approval event when no approval service is composed', async () => {
    const f = fakeChild({ globalTools: [], presetTools: ['read'], approval: false })
    await confine(f.childCtx, f.child, { root: 'C:/run/c1', preset: 'mutator', presets: f.presets })
    expect(f.appended.map(e => e.type)).toEqual(['agent-preset/selected', 'sandbox/mode'])
  })

  it('never allows run_code or a name that is also a global tool', async () => {
    const f = fakeChild({ globalTools: ['run_code', 'read'], presetTools: ['read', 'edit'] })
    await confine(f.childCtx, f.child, { root: 'C:/run/c1', preset: 'mutator', presets: f.presets })
    expect(f.restrictions).toEqual([{ allow: ['edit'] }])
  })
})
