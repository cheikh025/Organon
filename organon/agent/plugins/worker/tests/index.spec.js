import { describe, expect, it, vi } from 'vitest'

const spawn = vi.fn(async () => ({ id: 'w1', done: Promise.resolve() }))
const reply = vi.fn((_options, stream) => stream)
vi.mock('../src/workers.js', () => ({
  Workers: class { spawn = spawn; reply = reply; stopAll() {} },
}))

const { apply, DEFAULT_PRESET } = await import('../src/index.js')

const listeners = {}

function spawnWorkerTool() {
  const tools = []
  apply({
    provide: () => {},
    effect: () => {},
    on: (name, listener) => { listeners[name] = listener },
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
    const result = await tool.execute({ directory: 'w1', message: 'b', description: 'd' }, exec)
    expect(result).toEqual({ id: 'w1' })
    expect(DEFAULT_PRESET).toBe('mutator')
    expect(spawn.mock.calls[0][0]).toMatchObject({ preset: 'mutator', message: 'b', notify: true })
  })

  it('passes a named preset through', async () => {
    spawn.mockClear()
    const tool = spawnWorkerTool()
    await tool.execute({ preset: 'explore', directory: 'w1', message: 'b', description: 'd' }, exec)
    expect(spawn.mock.calls[0][0].preset).toBe('explore')
  })

  it('passes a time limit through', async () => {
    spawn.mockClear()
    const tool = spawnWorkerTool()
    await tool.execute({ directory: 'w1', message: 'b', description: 'd', timeLimit: 30 }, exec)
    expect(spawn.mock.calls[0][0].timeLimit).toBe(30)
  })

  it('hands every model reply to the workers service, which cuts a worker\'s at its limit', () => {
    spawnWorkerTool()
    const stream = {}
    expect(listeners['llm/stream']({ sessionId: 'w1' }, () => stream)).toBe(stream)
    expect(reply).toHaveBeenCalledWith({ sessionId: 'w1' }, stream)
  })

  it('accepts a call without preset', () => {
    const tool = spawnWorkerTool()
    expect(tool.isConcurrencySafe({ directory: 'w1', message: 'b', description: 'd' })).toBe(true)
  })
})
