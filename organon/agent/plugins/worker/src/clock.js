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

/**
 * How the worker concludes once time is up: in the time-up steering and in the
 * reason a refused tool call gives. For the search an unchanged candidate is
 * worth no more than a broken one, so an untested draft is worth writing.
 */
const FINISH = 'When you end, your folder is evaluated exactly as it is. If you have a better program than the one '
  + 'in your folder, tested or only drafted in your reasoning, write it now in one write or edit; an untested '
  + 'program is worth more than an unchanged one. Then end with your closing message, and say whether the final '
  + 'program was tested.'

export class Clock {
  #limitMs
  #now
  #start
  #lastLine
  #timers = []
  /**
   * Whether the worker's next reply was requested before the limit (cut at the
   * limit) or after it (left whole); set by each `agent/request`, read by the
   * reply it starts. Model calls the loop does not make, such as compaction's
   * summaries, find it unset and are left whole.
   * @type {'before' | 'after' | undefined}
   */
  #requested
  /** Replies of the loop being passed through now that the limit would cut. */
  #replying = 0
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
      this.#requested = this.timeUp ? 'after' : 'before'
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
    let wrapUp
    at(this.#limitMs * WRAP_UP_SHARE, () => {
      const left = this.#minutesLeft()
      const minutes = left === 1 ? '1 minute' : `${left} minutes`
      wrapUp = notice(
        `${minutes} left. Stop exploring new approaches, variants or sweeps. Make sure your folder `
          + 'holds your best version, check it once, then end with your closing message.',
        `Worker time: ${minutes} left`,
      )
      agent.inject(wrapUp)
    })
    at(this.#limitMs, () => {
      // A wrap-up still waiting behind a long step is out of date by now.
      if (wrapUp !== undefined) agent.inbox.remove(wrapUp.id)
      const cut = this.#replying > 0 ? ', and your last reasoning was cut here' : ''
      // The steering goes in before the cut, so the step after the cut brings it.
      agent.inject(notice(`Time is up${cut}. Commands are no longer available. ${FINISH}`, 'Worker time is up'))
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
   * Pass a model reply of this worker through: a reply the loop requested
   * before the limit is cut at the limit; one requested after it, at low
   * effort, and any other model call stay whole.
   * @param {AsyncIterable<object>} stream - the reply's chunks.
   * @returns {AsyncIterable<object>}
   */
  cut(stream) {
    const requested = this.#requested
    this.#requested = undefined
    return requested === 'before' ? this.#counted(cutAtTimeUp(stream, this.#timeUp.signal)) : stream
  }

  /** Count a reply while it is passed through, so the time-up steering can say whether it cut one. */
  async* #counted(stream) {
    this.#replying++
    try {
      yield* stream
    } finally {
      this.#replying--
    }
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
  let onLimit
  const limit = new Promise((resolve) => {
    onLimit = () => resolve(CUT)
    if (signal.aborted) onLimit()
    else signal.addEventListener('abort', onLimit, { once: true })
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
    // The limit signal lives as long as the worker: each reply removes its own listener.
    signal.removeEventListener('abort', onLimit)
    // An adapter stream closes only after its pending read settles; the reply
    // ends here without waiting for that.
    if (!finished) Promise.resolve(iterator.return?.()).catch(() => undefined)
  }
  yield { type: 'finish', reason: { kind: 'stop' } }
}
