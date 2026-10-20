import { mkdtempSync, rmSync, statSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, it, vi } from 'vitest'

vi.mock('@deepseek-ai/dsh-llm', () => ({
  createUserMessage: message => ({ ...message }),
  boundContextSummary: summary => summary,
}))
vi.mock('@deepseek-ai/dsh-subagent', () => ({
  SUBAGENT_DESCRIPTOR_VERSION: 3,
  resolveChildDepth: () => 1,
  resolveChildAgentOptions: (_parent, _requested, depth) => ({ model: 'parent-model', subagentDepth: depth }),
  finalAssistantOutput: (events) => {
    const last = events.filter(e => e.type === 'assistant/message').at(-1)
    return last?.data.message.content
  },
}))

const { Workers } = await import('../src/workers.js')
const { Clock } = await import('../src/clock.js')

let base
afterEach(() => { if (base) rmSync(base, { recursive: true, force: true }) })

/** A fake worker Agent whose turn appends the given events. */
function fakeAgent(id, turn) {
  const log = []
  const agent = {
    id,
    status: 'idle',
    followups: [],
    cancelled: [],
    session: {
      header: { id, createdAt: 1700000000000 },
      records: [],
      append(type, data) { this.records.push({ type, data }) },
      get seq() { return log.length },
      snapshotEvents: from => log.slice(from),
    },
    ctx: { get: () => undefined },
    followup(message) {
      this.followups.push(message)
      this.pending = Promise.resolve().then(() => { log.push(...turn(this)) })
    },
    whenIdle() { return this.pending ?? Promise.resolve() },
    cancel(cause) { this.cancelled.push(cause) },
  }
  return agent
}

function harness(turn) {
  base = mkdtempSync(join(tmpdir(), 'worker-svc-'))
  const parent = fakeAgent('main', () => [])
  parent.steered = []
  parent.steer = message => parent.steered.push(message)
  const created = []
  const emitted = []
  const ctx = {
    agentPresets: { mount: vi.fn(async () => ({ id: 'mutator' })) },
    agents: {
      get: id => (id === 'main' ? parent : undefined),
      create: vi.fn(async (options) => {
        const agent = fakeAgent(options.sessionId, turn)
        const handle = { agent, dispose: vi.fn(async () => undefined) }
        created.push({ options, handle })
        return handle
      }),
    },
    emit: (name, info) => emitted.push({ name, info }),
  }
  return { ctx, parent, created, emitted, workers: new Workers(ctx) }
}

const message = text => ({ type: 'assistant/message', data: { message: { content: [{ type: 'text', text }] } } })
const turnEnd = kind => ({ type: 'turn/end', data: { reason: { kind } } })

describe('Workers.spawn', () => {
  it('records the worker as a one-shot child, as DSH does, so DSH web lists it under its parent', async () => {
    const h = harness(() => [message('done'), turnEnd('completed')])
    const { id, done } = await h.workers.spawn({
      preset: 'mutator', directory: join(base, 'w'), message: 'b', description: 'mutator from c000000', parent: h.parent,
    })
    await done
    expect(h.parent.session.records).toEqual([{
      type: 'subagent/catalog',
      data: { version: 0, childId: id, childCreatedAt: 1700000000000, mode: 'one-shot', label: 'mutator from c000000' },
    }])

    const child = fakeAgent(id, () => [])
    const childCtx = {
      get: () => undefined,
      tools: { schemas: () => [{ name: 'read' }], restrict: vi.fn(), guard: vi.fn() },
      systemPrompt: { getContextOrder: () => 120, context: vi.fn() },
    }
    await h.created[0].options.setup(childCtx, child)
    expect(child.session.records.at(-1)).toEqual({
      type: 'subagent/descriptor',
      data: { version: 3, mode: 'one-shot', provider: 'organon-worker', label: 'mutator from c000000' },
    })
  })

  it('creates the worker in its own folder and returns its last message to the caller', async () => {
    const h = harness(() => [message('Changed the IO. Expect +1%.'), turnEnd('completed')])
    const directory = join(base, 'search', 'candidates', 'c000001')
    const { id, done } = await h.workers.spawn({
      preset: 'mutator', directory, message: 'Improve ./solution.cpp', description: 'mutator from c000000', parent: h.parent,
    })

    expect(statSync(directory).isDirectory()).toBe(true)
    const { options } = h.created[0]
    expect(options.sessionId).toBe(id)
    expect(options.parentAgent).toBe(h.parent)
    expect(options.meta).toMatchObject({ parentSession: 'main', origin: 'subagent', delegationDepth: 1, agentPreset: 'mutator' })
    expect(options.meta.cwd.toLowerCase()).toBe(directory.toLowerCase())
    expect(options.agentOptions).toEqual({ model: 'parent-model', subagentDepth: 1 })
    expect(typeof options.setup).toBe('function')

    const result = await done
    expect(result).toEqual({ id, lastMessage: 'Changed the IO. Expect +1%.', stopReason: 'completed' })
    expect(h.created[0].handle.agent.followups[0].content).toEqual([{ type: 'text', text: 'Improve ./solution.cpp' }])
    expect(h.created[0].handle.dispose).toHaveBeenCalled()
    expect(h.parent.followups).toEqual([]) // the loop's path sends no notice
    expect(h.emitted.map(e => e.name)).toEqual(['worker/start', 'worker/end'])
    expect(h.workers.list()).toEqual([])
  })

  it('sends the parent DSH\'s completion notice when asked', async () => {
    const h = harness(() => [message('Wrote gen.py.'), turnEnd('completed')])
    const { id, done } = await h.workers.spawn({
      preset: 'mutator', directory: join(base, 'w'), message: 'b', description: 'd', parent: h.parent, notify: true,
    })
    await done
    const notice = h.parent.followups[0]
    expect(notice.source).toMatchObject({ kind: 'subagent-settled', form: 'notice', senderSessionId: id })
    expect(notice.content.map(b => b.text)).toEqual([
      `Background subagent ${id} finished. It cannot receive follow-up messages.`,
      'Its closing message:',
      'Wrote gen.py.',
    ])
  })

  it('steers the notice in when the parent is busy', async () => {
    const h = harness(() => [turnEnd('completed')])
    h.parent.status = 'running'
    const { done } = await h.workers.spawn({
      preset: 'mutator', directory: join(base, 'w'), message: 'b', parent: h.parent, notify: true,
    })
    await done
    expect(h.parent.steered).toHaveLength(1)
    expect(h.parent.steered[0].content.at(-1).text).toBe('It left no closing message.')
  })

  it('cancels the worker when the caller\'s signal aborts', async () => {
    const controller = new AbortController()
    const h = harness((agent) => {
      controller.abort()
      return [turnEnd(agent.cancelled.length > 0 ? 'aborted' : 'completed')]
    })
    const { done } = await h.workers.spawn({
      preset: 'mutator', directory: join(base, 'w'), message: 'b', parent: h.parent, signal: controller.signal,
    })
    const result = await done
    expect(result.stopReason).toBe('aborted')
    expect(h.created[0].handle.agent.cancelled).toEqual([{ kind: 'parent' }])
  })

  it('gives a worker with a time limit its clock: its hooks, and its replies cut at the limit', async () => {
    const stream = { [Symbol.asyncIterator]: () => ({ next: async () => ({ done: true }) }) }
    const cut = vi.spyOn(Clock.prototype, 'cut')
    const h = harness((agent) => {
      h.workers.reply({ sessionId: agent.id }, stream)
      h.workers.reply({ sessionId: 'main' }, stream)
      return [message('done'), turnEnd('completed')]
    })
    const { id, done } = await h.workers.spawn({
      preset: 'mutator', directory: join(base, 'w'), message: 'b', parent: h.parent, timeLimit: 60,
    })

    const child = fakeAgent(id, () => [])
    const listeners = []
    const childCtx = {
      get: () => undefined,
      on: name => listeners.push(name),
      tools: { schemas: () => [{ name: 'read' }], restrict: vi.fn(), guard: vi.fn() },
      systemPrompt: { getContextOrder: () => 120, context: vi.fn() },
    }
    await h.created[0].options.setup(childCtx, child)
    expect(listeners).toEqual(['agent/pre-step', 'agent/request', 'tools/execute'])
    expect(childCtx.tools.guard).toHaveBeenCalledTimes(2)

    await done
    // Only the worker's own replies go to its clock, and only while it runs.
    expect(cut).toHaveBeenCalledTimes(1)
    expect(cut).toHaveBeenCalledWith(stream)
    h.workers.reply({ sessionId: id }, stream)
    expect(cut).toHaveBeenCalledTimes(1)
    cut.mockRestore()
  })

  it('gives a worker without a time limit no clock', async () => {
    const h = harness(() => [turnEnd('completed')])
    const { id, done } = await h.workers.spawn({ preset: 'mutator', directory: join(base, 'w'), message: 'b', parent: h.parent })
    const stream = { [Symbol.asyncIterator]: () => ({ next: async () => ({ done: true }) }) }
    expect(h.workers.reply({ sessionId: id }, stream)).toBe(stream)
    await done
  })

  it('rejects a time limit that is not a positive number of minutes', async () => {
    const h = harness(() => [])
    await expect(h.workers.spawn({ preset: 'mutator', directory: join(base, 'w'), message: 'b', parent: h.parent, timeLimit: -5 }))
      .rejects.toThrow(/positive number of minutes/)
    expect(h.created).toEqual([])
  })

  it('rejects missing arguments before creating anything', async () => {
    const h = harness(() => [])
    await expect(h.workers.spawn({ preset: 'mutator', directory: 'relative', message: 'b', parent: h.parent }))
      .rejects.toThrow(/absolute directory/)
    await expect(h.workers.spawn({ preset: '', directory: join(base, 'w'), message: 'b', parent: h.parent }))
      .rejects.toThrow(/non-empty preset/)
    expect(h.created).toEqual([])
  })
})
