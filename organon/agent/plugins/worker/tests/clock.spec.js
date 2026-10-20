import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@deepseek-ai/dsh-llm', () => {
  let ids = 0
  return {
    createUserMessage: message => ({ ...message, id: `m${++ids}` }),
    boundContextSummary: summary => summary,
  }
})

const { Clock, cutAtTimeUp } = await import('../src/clock.js')

const MINUTE = 60_000

/** A fake worker Agent that records what it is sent and what is removed from its inbox. */
function fakeAgent() {
  const agent = {
    injected: [],
    cancelled: [],
    removed: [],
    inject(message) { agent.injected.push(message) },
    cancel(cause) { agent.cancelled.push(cause) },
  }
  agent.inbox = { remove: (id) => { agent.removed.push(id); return true } }
  return agent
}

/** A fake scoped context that keeps the listeners and the guard. */
function fakeChildCtx() {
  const listeners = {}
  const guards = []
  return {
    listeners,
    guards,
    on: (name, listener) => { listeners[name] = listener },
    tools: { guard: guard => guards.push(guard) },
  }
}

async function* chunks(list) {
  for (const chunk of list) yield chunk
}

async function collect(stream) {
  const out = []
  for await (const chunk of stream) out.push(chunk)
  return out
}

beforeEach(() => { vi.useFakeTimers() })
afterEach(() => { vi.useRealTimers() })

describe('Clock', () => {
  it('rejects a limit that is not a positive number of minutes', () => {
    expect(() => new Clock(0)).toThrow(/positive number of minutes/)
    expect(() => new Clock('60')).toThrow(/positive number of minutes/)
  })

  it('shows the time at the first step, then every 5 minutes, then at every step from the wrap-up on', () => {
    const clock = new Clock(60)
    clock.start(fakeAgent())
    expect(clock.line()).toBe('Time: 0 of 60 minutes used, 60 left.')
    vi.advanceTimersByTime(2 * MINUTE)
    expect(clock.line()).toBeUndefined()
    vi.advanceTimersByTime(3 * MINUTE)
    expect(clock.line()).toBe('Time: 5 of 60 minutes used, 55 left.')
    vi.advanceTimersByTime(47 * MINUTE)
    expect(clock.line()).toBe('Time: 52 of 60 minutes used, 8 left.')
    expect(clock.line()).toBe('Time: 52 of 60 minutes used, 8 left.')
    vi.advanceTimersByTime(9 * MINUTE)
    expect(clock.line()).toBe('Time: 61 of 60 minutes used. Time is up.')
    clock.stop()
  })

  it('steers the worker to wrap up with 15% left, to conclude at the limit, and cancels it at 20% past', () => {
    const agent = fakeAgent()
    const clock = new Clock(60)
    clock.start(agent)

    vi.advanceTimersByTime(51 * MINUTE)
    expect(agent.injected).toHaveLength(1)
    expect(agent.injected[0].content[0].text).toMatch(/^9 minutes left\. Stop exploring/)
    expect(agent.injected[0].source).toEqual({ kind: 'worker-time', form: 'notice', summary: 'Worker time: 9 minutes left' })
    expect(clock.timeUp).toBe(false)

    vi.advanceTimersByTime(9 * MINUTE)
    expect(clock.timeUp).toBe(true)
    expect(agent.injected[1].content[0].text).toMatch(/^Time is up\. Commands are no longer available\. When you end, your folder is evaluated exactly as it is\./)
    expect(agent.injected[1].content[0].text).toMatch(/tested or only drafted in your reasoning/)
    // The wrap-up, if still waiting, is out of date at the limit.
    expect(agent.removed).toEqual([agent.injected[0].id])

    vi.advanceTimersByTime(11 * MINUTE)
    expect(agent.cancelled).toEqual([])
    vi.advanceTimersByTime(MINUTE)
    expect(agent.cancelled).toEqual([{ kind: 'parent' }])
  })

  it('sends nothing once stopped', () => {
    const agent = fakeAgent()
    const clock = new Clock(60)
    clock.start(agent)
    clock.stop()
    vi.advanceTimersByTime(120 * MINUTE)
    expect(agent.injected).toEqual([])
    expect(agent.cancelled).toEqual([])
  })
})

describe('Clock.attach', () => {
  it('adds the time line to the step\'s messages, as a snapshot', async () => {
    const childCtx = fakeChildCtx()
    const clock = new Clock(60)
    clock.attach(childCtx)
    clock.start(fakeAgent())
    const decision = await childCtx.listeners['agent/pre-step']({}, async () => ({ kind: 'enter', messages: ['task'] }))
    expect(decision.messages).toHaveLength(2)
    expect(decision.messages[1].source).toMatchObject({ kind: 'worker-time', form: 'snapshot' })
    expect(decision.messages[1].content[0].text).toBe('Time: 0 of 60 minutes used, 60 left.')

    const quiet = await childCtx.listeners['agent/pre-step']({}, async () => ({ kind: 'enter', messages: [] }))
    expect(quiet.messages).toEqual([])
    const rejected = await childCtx.listeners['agent/pre-step']({}, async () => ({ kind: 'reject' }))
    expect(rejected).toEqual({ kind: 'reject' })
    clock.stop()
  })

  it('cuts only a reply the loop requested before the limit; later replies and other model calls stay whole', async () => {
    const childCtx = fakeChildCtx()
    const clock = new Clock(60)
    clock.attach(childCtx)
    clock.start(fakeAgent())
    const request = () => childCtx.listeners['agent/request']({}, async () => ({ model: 'm' }))
    const stream = chunks([])

    // Not requested by the loop (a compaction summary, say): left whole.
    expect(clock.cut(stream)).toBe(stream)

    await request()
    const before = clock.cut(stream)
    expect(before).not.toBe(stream)
    // The request is used up by its reply; the next model call is not the loop's.
    expect(clock.cut(stream)).toBe(stream)

    vi.advanceTimersByTime(60 * MINUTE)
    await request()
    expect(clock.cut(stream)).toBe(stream)
    clock.stop()
  })

  it('cuts a reply requested just before the limit even when it starts after it', async () => {
    const childCtx = fakeChildCtx()
    const clock = new Clock(60)
    clock.attach(childCtx)
    clock.start(fakeAgent())
    vi.advanceTimersByTime(60 * MINUTE - 1)
    const config = await childCtx.listeners['agent/request']({}, async () => ({ model: 'm', reasoningEffort: 'max' }))
    expect(config.reasoningEffort).toBe('max')
    vi.advanceTimersByTime(1)
    expect(await collect(clock.cut(chunks([{ type: 'block-start', index: 0, blockType: 'reasoning' }]))))
      .toEqual([{ type: 'finish', reason: { kind: 'stop' } }])
    clock.stop()
  })

  it('tells the worker its reasoning was cut when the limit cut a reply', async () => {
    const childCtx = fakeChildCtx()
    const agent = fakeAgent()
    const clock = new Clock(60)
    clock.attach(childCtx)
    clock.start(agent)
    await childCtx.listeners['agent/request']({}, async () => ({ model: 'm' }))
    const gate = Promise.withResolvers()
    async function* provider() {
      yield { type: 'block-start', index: 0, blockType: 'reasoning' }
      yield { type: 'reasoning-delta', index: 0, text: 'Drafting the kernel' }
      await gate.promise
    }
    const out = []
    const reading = (async () => { for await (const chunk of clock.cut(provider())) out.push(chunk) })()
    await vi.advanceTimersByTimeAsync(0)
    await vi.advanceTimersByTimeAsync(60 * MINUTE)
    await reading
    expect(agent.injected.at(-1).content[0].text).toMatch(/^Time is up, and your last reasoning was cut here\. Commands/)
    expect(out.at(-1)).toEqual({ type: 'finish', reason: { kind: 'stop' } })
    gate.resolve()
    clock.stop()
  })

  it('says "1 minute" when one minute is left at the wrap-up', () => {
    const agent = fakeAgent()
    const clock = new Clock(5)
    clock.start(agent)
    vi.advanceTimersByTime(4.25 * MINUTE)
    expect(agent.injected[0].content[0].text).toMatch(/^1 minute left\./)
    expect(agent.injected[0].source.summary).toBe('Worker time: 1 minute left')
    clock.stop()
  })

  it('lowers reasoning effort and refuses all but the file tools once time is up', async () => {
    const childCtx = fakeChildCtx()
    const clock = new Clock(60)
    clock.attach(childCtx)
    clock.start(fakeAgent())
    const request = () => childCtx.listeners['agent/request']({}, async () => ({ model: 'm', reasoningEffort: 'max' }))
    const [guard] = childCtx.guards

    expect(await request()).toEqual({ model: 'm', reasoningEffort: 'max' })
    expect(guard({ name: 'pwsh' })).toBeUndefined()

    vi.advanceTimersByTime(60 * MINUTE)
    expect(await request()).toEqual({ model: 'm', reasoningEffort: 'low' })
    expect(guard({ name: 'pwsh' })).toMatch(/^Time is up: pwsh is no longer available\./)
    expect(guard({ name: 'job_output' })).toMatch(/no longer available/)
    for (const name of ['read', 'write', 'edit']) expect(guard({ name })).toBeUndefined()
    clock.stop()
  })

  it('lets a running command finish until 10% past the limit, then stops it', async () => {
    const childCtx = fakeChildCtx()
    const clock = new Clock(60)
    clock.attach(childCtx)
    clock.start(fakeAgent())
    const caller = new AbortController()
    const exec = { name: 'pwsh', signal: caller.signal }
    let seen
    const finished = Promise.withResolvers()
    const result = childCtx.listeners['tools/execute'](exec, async () => {
      seen = exec.signal
      await finished.promise
      return { content: [] }
    })

    vi.advanceTimersByTime(65 * MINUTE)
    expect(seen.aborted).toBe(false)
    vi.advanceTimersByTime(MINUTE)
    expect(seen.aborted).toBe(true)
    finished.resolve()
    await result
    expect(exec.signal).toBe(caller.signal)
    clock.stop()
  })
})

describe('cutAtTimeUp', () => {
  const reply = [
    { type: 'block-start', index: 0, blockType: 'reasoning' },
    { type: 'reasoning-delta', index: 0, text: 'Try a sweep.' },
    { type: 'block-end', index: 0, block: { type: 'reasoning', text: 'Try a sweep.' } },
    { type: 'block-start', index: 1, blockType: 'tool-call' },
    { type: 'tool-call-delta', index: 1, id: 'c1', name: 'pwsh', argumentsDelta: '{"command":"x"}' },
    { type: 'block-end', index: 1, block: { type: 'tool-call', id: 'c1', name: 'pwsh', arguments: '{"command":"x"}' } },
    { type: 'usage', usage: { inputTokens: 1, outputTokens: 2 } },
    { type: 'finish', reason: { kind: 'tool-calls' } },
  ]

  it('passes a reply through unchanged when time is not up', async () => {
    expect(await collect(cutAtTimeUp(chunks(reply), new AbortController().signal))).toEqual(reply)
  })

  it('removes its listener from the limit signal when the reply ends', async () => {
    const limit = new AbortController()
    const remove = vi.spyOn(limit.signal, 'removeEventListener')
    await collect(cutAtTimeUp(chunks(reply), limit.signal))
    expect(remove).toHaveBeenCalledWith('abort', expect.any(Function))
  })

  it('keeps the reasoning so far and drops a half-written tool call', async () => {
    const limit = new AbortController()
    const gate = Promise.withResolvers()
    let closed = false
    async function* provider() {
      try {
        yield reply[0]
        yield reply[1]
        yield reply[2]
        yield reply[3]
        yield { type: 'tool-call-delta', index: 1, id: 'c1', name: 'pwsh', argumentsDelta: '{"comm' }
        await gate.promise
        yield { type: 'tool-call-delta', index: 1, id: 'c1', argumentsDelta: 'and":"x"}' }
      } finally {
        closed = true
      }
    }
    const out = []
    const cut = cutAtTimeUp(provider(), limit.signal)
    const reading = (async () => { for await (const chunk of cut) out.push(chunk) })()
    await vi.waitFor(() => expect(out).toHaveLength(3))
    limit.abort()
    await reading
    expect(out).toEqual([...reply.slice(0, 3), { type: 'finish', reason: { kind: 'stop' } }])

    gate.resolve()
    await vi.waitFor(() => expect(closed).toBe(true))
  })

  it('drops a reasoning block that has no text yet', async () => {
    const limit = new AbortController()
    const gate = Promise.withResolvers()
    async function* provider() {
      yield { type: 'block-start', index: 0, blockType: 'reasoning' }
      await gate.promise
    }
    const out = []
    const reading = (async () => { for await (const chunk of cutAtTimeUp(provider(), limit.signal)) out.push(chunk) })()
    await vi.advanceTimersByTimeAsync(0)
    limit.abort()
    await reading
    expect(out).toEqual([{ type: 'finish', reason: { kind: 'stop' } }])
    gate.resolve()
  })
})
