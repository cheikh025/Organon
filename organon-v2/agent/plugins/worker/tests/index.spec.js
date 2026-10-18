import { describe, expect, it, vi } from 'vitest'

const spawn = vi.fn(async () => ({ id: 'w1', done: Promise.resolve() }))
vi.mock('../src/workers.js', () => ({
  Workers: class { spawn = spawn; stopAll() {} },
}))

const { apply, DEFAULT_PRESET } = await import('../src/index.js')

function spawnWorkerTool() {
  const tools = []
  apply({
    provide: () => {},
    effect: () => {},
    tools: { register: tool => tools.push(tool) },
    workingDirectory: { ensure: async () => 'C:\\run' },
  })
  return tools.find(tool => tool.name === 'spawn_worker')
}

const exec = { agent: { id: 'main' }, signal: new AbortController().signal }

describe('spawn_worker', () => {
  it('uses the default worker preset when the call names none', async () => {
    spawn.mockClear()
    const tool = spawnWorkerTool()
    const result = await tool.execute({ directory: 'w1', brief: 'b', description: 'd' }, exec)
    expect(result).toEqual({ id: 'w1' })
    expect(DEFAULT_PRESET).toBe('mutator')
    expect(spawn.mock.calls[0][0]).toMatchObject({ preset: 'mutator', brief: 'b', notify: true })
  })

  it('passes a named preset through', async () => {
    spawn.mockClear()
    const tool = spawnWorkerTool()
    await tool.execute({ preset: 'explore', directory: 'w1', brief: 'b', description: 'd' }, exec)
    expect(spawn.mock.calls[0][0].preset).toBe('explore')
  })

  it('accepts a call without preset', () => {
    const tool = spawnWorkerTool()
    expect(tool.isConcurrencySafe({ directory: 'w1', brief: 'b', description: 'd' })).toBe(true)
  })
})
