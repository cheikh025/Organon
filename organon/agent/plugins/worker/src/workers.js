/**
 * The `workers` service: one-shot worker agents, each confined to its own
 * folder. A worker behaves like a DSH spawn subagent: it starts fresh, gets
 * its preset and message, runs in the background, and its last message goes
 * back to the caller. It cannot receive follow-up messages. A preset may have
 * its own model, set in the plugin's `models` config; a worker of any other
 * preset runs on the model of the agent it works for.
 *
 * DSH's subagent service cannot give a child its own starting folder, which
 * is the sandbox's write boundary, so workers are created directly with
 * `ctx.agents.create`. They write the two records that service writes for a
 * one-shot child, so DSH web lists them under their parent and opens them.
 *
 * @module @organon/worker/workers
 */

import { randomUUID } from 'node:crypto'
import { mkdir } from 'node:fs/promises'
import { isAbsolute } from 'node:path'
import { createUserMessage, boundContextSummary } from '@deepseek-ai/dsh-llm'
import { finalAssistantOutput, resolveChildAgentOptions, resolveChildDepth, SUBAGENT_DESCRIPTOR_VERSION } from '@deepseek-ai/dsh-subagent'
import { confine } from './confine.js'
import { noticeOf, stopReasonOf, textOf } from './outcome.js'
import { canonical } from './paths.js'

/**
 * @typedef {object} SpawnOptions
 * @property {string} preset - id of the worker's agent preset (its persona and tools).
 * @property {string} directory - absolute path of the only folder the worker may write in; created if missing.
 * @property {string} message - the first message sent to the worker.
 * @property {string} [description] - a short label for listings; the worker never sees it.
 * @property {object} parent - the Agent the worker works for.
 * @property {AbortSignal} [signal] - cancels the start and, while it runs, the worker.
 * @property {boolean} [notify] - send the parent DSH's completion notice when the worker finishes.
 */

/**
 * @typedef {object} ModelRoute
 * @property {string} provider - a registered LLM provider id.
 * @property {string} model - the provider's model id.
 * @property {string} [reasoningEffort] - omitted, a worker on its parent's model keeps the parent's
 *   effort, and a worker on another model gets that model's default.
 */

/**
 * @typedef {object} WorkerResult
 * @property {string} id - the worker's id (its session id).
 * @property {string} lastMessage - the text of the worker's last message; empty when it left none.
 * @property {'completed' | 'aborted' | 'error' | 'max-tokens' | 'refusal'} stopReason
 */

/** The name workers give as their provider in DSH's subagent records. */
export const PROVIDER = 'organon-worker'
/** The format DSH's subagent catalog expects for a local child. */
const CATALOG_FORMAT = 0
/** The keys a model route may have. */
const ROUTE_KEYS = Object.freeze(new Set(['provider', 'model', 'reasoningEffort']))

/**
 * Check the plugin's `models` config: preset ids mapped to model routes.
 * @param {unknown} models
 * @returns {Map<string, ModelRoute>}
 */
export function checkModels(models) {
  const routes = new Map()
  if (models == null) return routes
  if (typeof models !== 'object' || Array.isArray(models)) {
    throw new Error('worker models must map preset ids to { provider, model, reasoningEffort }')
  }
  for (const [preset, route] of Object.entries(models)) {
    if (route === null || typeof route !== 'object' || Array.isArray(route)) {
      throw new Error(`worker models: "${preset}" must be { provider, model, reasoningEffort }`)
    }
    for (const key of Object.keys(route)) {
      if (!ROUTE_KEYS.has(key)) {
        throw new Error(`worker models: "${preset}" has an unknown key "${key}" (allowed: provider, model, reasoningEffort)`)
      }
    }
    for (const key of ['provider', 'model']) {
      if (typeof route[key] !== 'string' || route[key] === '') throw new Error(`worker models: "${preset}" needs a non-empty ${key}`)
    }
    const effort = route.reasoningEffort
    if (effort !== undefined && (typeof effort !== 'string' || effort === '')) {
      throw new Error(`worker models: "${preset}" needs reasoningEffort to be a non-empty string when it is given`)
    }
    routes.set(preset, Object.freeze({
      provider: route.provider,
      model: route.model,
      ...effort === undefined ? {} : { reasoningEffort: effort },
    }))
  }
  return routes
}

export class Workers {
  #ctx
  /** Live workers by id. */
  #running = new Map()
  /** The model route of each preset that has one, by preset id. */
  #models

  /**
   * @param {object} ctx - the plugin context.
   * @param {{ models?: unknown }} [options] - `models`: the plugin's `models` config.
   */
  constructor(ctx, { models } = {}) {
    this.#ctx = ctx
    this.#models = checkModels(models)
  }

  /**
   * Start one worker. Resolves once the worker exists, with its id and a
   * promise of its outcome; the worker keeps running in the background.
   * @param {SpawnOptions} options
   * @returns {Promise<{ id: string, done: Promise<WorkerResult> }>}
   */
  async spawn({ preset, directory, message, description, parent, signal, notify = false }) {
    for (const [name, value] of Object.entries({ preset, directory, message })) {
      if (typeof value !== 'string' || value === '') throw new Error(`a worker needs a non-empty ${name}`)
    }
    if (!isAbsolute(directory)) throw new Error('a worker needs an absolute directory')
    if (parent?.session === undefined) throw new Error('a worker needs the parent Agent it works for')
    const route = this.#routeOf(preset)
    signal?.throwIfAborted()

    await mkdir(directory, { recursive: true })
    const root = canonical(directory)
    const depth = resolveChildDepth(parent, undefined)
    const id = randomUUID()
    const presets = this.#ctx.agentPresets
    const label = typeof description === 'string' && description !== '' ? description : undefined

    const handle = await this.#ctx.agents.create({
      sessionId: id,
      parentAgent: parent,
      meta: {
        cwd: root,
        parentSession: parent.session.header.id,
        origin: 'subagent',
        delegationDepth: depth,
        agentPreset: preset,
      },
      agentOptions: resolveChildAgentOptions(parent, route, depth),
      ...signal === undefined ? {} : { signal },
      setup: async (childCtx, child) => {
        await confine(childCtx, child, { root, preset, presets })
        child.session.append('subagent/descriptor', {
          version: SUBAGENT_DESCRIPTOR_VERSION,
          mode: 'one-shot',
          provider: PROVIDER,
          ...label === undefined ? {} : { label },
        })
      },
    })
    parent.session.append('subagent/catalog', {
      version: CATALOG_FORMAT,
      childId: id,
      childCreatedAt: handle.agent.session.header.createdAt,
      mode: 'one-shot',
      ...label === undefined ? {} : { label },
    })

    const info = { id, parent: parent.id, preset, directory: root, description }
    this.#running.set(id, handle.agent)
    this.#ctx.emit('worker/start', info)
    const done = this.#run(handle, { message, signal })
      .then((result) => {
        this.#ctx.emit('worker/end', { ...info, stopReason: result.stopReason })
        if (notify) this.#notify(parent, result.id, result.stopReason, result.closing)
        return { id, lastMessage: textOf(result.closing), stopReason: result.stopReason }
      }, (error) => {
        this.#ctx.emit('worker/end', { ...info, stopReason: 'error' })
        if (notify) this.#notify(parent, id, 'error', undefined)
        throw error
      })
      .finally(() => this.#running.delete(id))
    return { id, done }
  }

  /** Ids of the workers running now. */
  list() {
    return [...this.#running.keys()]
  }

  /**
   * The model route of a preset, or undefined to run on the parent's model.
   * Refuses a route whose provider the `llm` service does not list.
   * @param {string} preset
   * @returns {ModelRoute | undefined}
   */
  #routeOf(preset) {
    const route = this.#models.get(preset)
    if (route === undefined) return undefined
    const providers = this.#ctx.get?.('llm')?.listProviders?.()
    if (Array.isArray(providers) && !providers.some(provider => provider.id === route.provider)) {
      const registered = providers.map(provider => provider.id).join(', ') || 'none'
      throw new Error(`worker preset "${preset}" is set to run on provider "${route.provider}", which is not registered `
        + `(registered: ${registered})`)
    }
    return route
  }

  /** Stop every running worker; used when the plugin is unloaded. */
  stopAll() {
    for (const agent of this.#running.values()) agent.cancel({ kind: 'parent' })
  }

  /** Deliver the message, wait for the worker to finish, read its outcome, release it. */
  async #run(handle, { message, signal }) {
    const agent = handle.agent
    const start = agent.session.seq
    const stop = () => agent.cancel({ kind: 'parent' })
    signal?.addEventListener('abort', stop, { once: true })
    try {
      if (signal?.aborted !== true) {
        agent.followup(createUserMessage({ content: [{ type: 'text', text: message }], source: { kind: 'user' } }))
        await agent.whenIdle()
      }
      const events = agent.session.snapshotEvents(start)
      const stopReason = signal?.aborted === true ? 'aborted' : stopReasonOf(events)
      return { id: agent.id, stopReason, closing: finalAssistantOutput(events) }
    } finally {
      signal?.removeEventListener('abort', stop)
      await this.#flush(agent)
      await handle.dispose()
    }
  }

  /** Persist the worker's log before it is released; best effort, like DSH. */
  async #flush(agent) {
    try {
      await agent.ctx.get('sessions')?.flush(agent.session)
    } catch (error) {
      this.#ctx.logger?.warn?.(`worker ${agent.id}: final session flush failed: ${error?.message ?? error}`)
    }
  }

  /**
   * Send the parent DSH's completion notice: it starts a new turn when the
   * parent is idle, and is steered into its current turn otherwise.
   */
  #notify(parent, id, stopReason, closing) {
    try {
      if (this.#ctx.agents.get(parent.id) !== parent) return
      const { summary, content } = noticeOf(id, stopReason, closing)
      const message = createUserMessage({
        content,
        source: { kind: 'subagent-settled', form: 'notice', summary: boundContextSummary(summary), senderSessionId: id },
      })
      if (parent.status === 'idle') parent.followup(message)
      else parent.steer(message)
    } catch (error) {
      this.#ctx.logger?.warn?.(`worker ${id}: completion notice was not delivered: ${error?.message ?? error}`)
    }
  }
}
