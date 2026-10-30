import { describe, expect, it, vi } from 'vitest'

const spawn = vi.fn(async () => ({ id: 'w1', done: Promise.resolve() }))
/** The options each `Workers` was constructed with. */
const constructed = []
vi.mock('../src/workers.js', () => ({
  Workers: class {
    constructor(_ctx, options) { constructed.push(options) }
    spawn = spawn
    stopAll() {}
  },
}))

const { apply, DEFAULT_PRESET } = await import('../src/index.js')

function spawnWorkerTool(config) {
  const tools = []
  apply({
    provide: () => {},
    effect: () => {},
    tools: { register: tool => tools.push(tool) },
    workingDirectory: { ensure: async () => 'C:\\run' },
  }, config)
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

  it('accepts a call without preset', () => {
    const tool = spawnWorkerTool()
    expect(tool.isConcurrencySafe({ directory: 'w1', message: 'b', description: 'd' })).toBe(true)
  })

  it('gives the workers service the model of each preset from the plugin config', () => {
    const models = { mutator: { provider: 'deepseek-official', model: 'deepseek-v4-pro' } }
    spawnWorkerTool({ models })
    expect(constructed.at(-1)).toEqual({ models })
    spawnWorkerTool()
    expect(constructed.at(-1)).toEqual({ models: undefined })
  })
})
