/**
 * A worker's time limit. The worker sees the time it has used and has left,
 * is steered to wrap up near the limit, and is made to conclude at the limit:
 * the reply in progress is cut (its reasoning kept), commands are refused,
 * and the remaining requests think at low effort. Nothing is killed at the
 * limit; a running command may finish within a grace period, and the worker
 * is cancelled only if it is still running long after the limit.
 *
 * @module @organon/worker/clock
 */

import { boundContextSummary, createUserMessage } from '@deepseek-ai/dsh-llm'

/** Share of the limit after which the worker is told to wrap up: 15% of it left. */
export const WRAP_UP_SHARE = 0.85
/** Interval between time lines before the wrap-up; from the wrap-up on, every step shows one. */
export const LINE_INTERVAL_MS = 5 * 60_000
/** Share of the limit until which a command already running may finish: 10% past it. */
export const COMMAND_SHARE = 1.1
/** Share of the limit after which a worker still running is cancelled: 20% past it. */
export const CANCEL_SHARE = 1.2
/** Reasoning effort of every request once time is up. */
export const TIME_UP_EFFORT = 'low'
/** Tools a worker may still use once time is up: its file tools, to save its best version. */
export const TIME_UP_TOOLS = Object.freeze(new Set(['read', 'read_image', 'write', 'edit', 'glob', 'grep']))

/** Source kind of the worker's time messages. */
const SOURCE = 'worker-time'
const MINUTE_MS = 60_000

/** The steering sent when time is up, and the reason a refused tool call gives. */
const FINISH = 'If your folder does not hold your best version yet, write it in one edit; '
  + 'then end with your closing message.'

export class Clock {
  #limitMs
  #now
  #start
  #lastLine
  #timers = []
  /** Aborted at the limit: cuts the reply in progress. */
  #timeUp = new AbortController()
  /** Aborted at the limit plus the command grace: stops the commands still running. */
  #commands = new AbortController()

  /**
   * @param {number} minutes - the worker's time limit.
   * @param {() => number} [now] - the clock, in milliseconds.
   */
  constructor(minutes, now = Date.now) {
    if (typeof minutes !== 'number' || !Number.isFinite(minutes) || minutes <= 0) {
      throw new Error('a worker time limit must be a positive number of minutes')
    }
    this.#limitMs = minutes * MINUTE_MS
    this.#now = now
  }

  /** Whether the limit has passed. */
  get timeUp() {
    return this.#timeUp.signal.aborted
  }

  /**
   * Register the worker's time hooks, while DSH creates its Agent: the time
   * line before each step, low effort and refused commands once time is up,
   * and the command deadline on every tool call.
   * @param {object} childCtx - the worker's scoped context.
   */
  attach(childCtx) {
    childCtx.on('agent/pre-step', async (_payload, next) => {
      const decision = await next()
      if (decision.kind === 'reject') return decision
      const text = this.line()
      if (text === undefined) return decision
      return {
        ...decision,
        messages: [...decision.messages, createUserMessage({
          content: [{ type: 'text', text }],
          source: { kind: SOURCE, form: 'snapshot', sections: [{ name: SOURCE, text }] },
        })],
      }
    })
    childCtx.on('agent/request', async (_payload, next) => {
      const config = await next()
      return this.timeUp ? { ...config, reasoningEffort: TIME_UP_EFFORT } : config
    })
    childCtx.on('tools/execute', async (exec, next) => {
      const signal = exec.signal
      exec.signal = AbortSignal.any([signal, this.#commands.signal])
      try {
        return await next()
      } finally {
        exec.signal = signal
      }
    })
    childCtx.tools.guard((execution) => {
      if (!this.timeUp || TIME_UP_TOOLS.has(execution.name)) return undefined
      return `Time is up: ${execution.name} is no longer available. ${FINISH}`
    })
  }

  /**
   * Start counting when the worker gets its first message.
   * @param {object} agent - the worker Agent.
   */
  start(agent) {
    this.#start = this.#now()
    const at = (ms, action) => { this.#timers.push(setTimeout(action, Math.max(0, ms))) }
    at(this.#limitMs * WRAP_UP_SHARE, () => {
      const left = this.#minutesLeft()
      const minutes = left === 1 ? '1 minute' : `${left} minutes`
      agent.inject(notice(
        `${minutes} left. Stop exploring new approaches, variants or sweeps. Make sure your folder `
          + 'holds your best version, check it once, then end with your closing message.',
        `Worker time: ${minutes} left`,
      ))
    })
    at(this.#limitMs, () => {
      // The steering goes in before the cut, so the step after the cut brings it.
      agent.inject(notice(`Time is up. Stop now: no more commands. ${FINISH}`, 'Worker time is up'))
      this.#timeUp.abort()
    })
    at(this.#limitMs * COMMAND_SHARE, () => this.#commands.abort(new Error('the worker time limit has passed')))
    at(this.#limitMs * CANCEL_SHARE, () => agent.cancel({ kind: 'parent' }))
  }

  /** Stop the timers; the worker has finished. */
  stop() {
    for (const timer of this.#timers) clearTimeout(timer)
    this.#timers = []
  }

  /**
   * The time line for the step about to start, or undefined when none is due:
   * one at the first step, then one per interval, then one at every step from
   * the wrap-up on.
   * @returns {string | undefined}
   */
  line() {
    const now = this.#now()
    const elapsed = now - this.#start
    const due = this.#lastLine === undefined
      || now - this.#lastLine >= LINE_INTERVAL_MS
      || elapsed >= this.#limitMs * WRAP_UP_SHARE
    if (!due) return undefined
    this.#lastLine = now
    const used = `Time: ${Math.floor(elapsed / MINUTE_MS)} of ${this.#limitMs / MINUTE_MS} minutes used`
    return elapsed >= this.#limitMs ? `${used}. Time is up.` : `${used}, ${this.#minutesLeft()} left.`
  }

  /**
   * Pass a reply of this worker through, cut at the limit.
   * @param {AsyncIterable<object>} stream - the reply's chunks.
   * @returns {AsyncIterable<object>}
   */
  cut(stream) {
    return cutAtTimeUp(stream, this.#timeUp.signal)
  }

  #minutesLeft() {
    return Math.max(0, Math.ceil((this.#limitMs - (this.#now() - this.#start)) / MINUTE_MS))
  }
}

/** A steering message, shown in DSH as a one-line notice. */
function notice(text, summary) {
  return createUserMessage({
    content: [{ type: 'text', text }],
    source: { kind: SOURCE, form: 'notice', summary: boundContextSummary(summary) },
  })
}

/** What the race between the next chunk and the limit returns when the limit wins. */
const CUT = Symbol('cut')

/**
 * Pass a reply's chunks through until `signal` aborts, then end the reply
 * there with a normal finish. A block is passed on only once it has something
 * to keep: text and reasoning at their first text, a tool call whole at its
 * end. So the cut keeps the text and reasoning so far and drops a half-written
 * tool call before it can run.
 * @param {AsyncIterable<object>} stream - the reply's chunks.
 * @param {AbortSignal} signal - aborted at the limit.
 * @returns {AsyncGenerator<object>}
 */
export async function* cutAtTimeUp(stream, signal) {
  const iterator = stream[Symbol.asyncIterator]()
  const limit = new Promise((resolve) => {
    if (signal.aborted) resolve(CUT)
    else signal.addEventListener('abort', () => resolve(CUT), { once: true })
  })
  /** Blocks not passed on yet, by index. A reply that is not cut passes on all of them unchanged. */
  const held = new Map()
  function* release() {
    for (const chunks of held.values()) yield* chunks
    held.clear()
  }
  let finished = false
  try {
    for (;;) {
      const pending = iterator.next()
      const next = await Promise.race([pending, limit])
      if (next === CUT) {
        pending.catch(() => undefined)
        break
      }
      if (next.done) {
        finished = true
        yield* release()
        return
      }
      const chunk = next.value
      const block = chunk.index === undefined ? undefined : held.get(chunk.index)
      if (chunk.type === 'block-start') {
        held.set(chunk.index, [chunk])
      } else if (block !== undefined) {
        block.push(chunk)
        if (chunk.type === 'block-end' || (chunk.type !== 'tool-call-delta' && chunk.text !== '')) {
          held.delete(chunk.index)
          yield* block
        }
      } else {
        if (chunk.type === 'usage' || chunk.type === 'finish') yield* release()
        yield chunk
      }
    }
  } finally {
    // An adapter stream closes only after its pending read settles; the reply
    // ends here without waiting for that.
    if (!finished) Promise.resolve(iterator.return?.()).catch(() => undefined)
  }
  yield { type: 'finish', reason: { kind: 'stop' } }
}
