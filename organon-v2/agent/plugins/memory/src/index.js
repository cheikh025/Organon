/**
 * Organon's memory plugin, mounted in the Organon preset so it reaches only
 * the main agent. It puts `agent/AGENTS.md` in the system prompt; the agent
 * reads the rest of memory itself. The plugin only reminds it, at three
 * moments: a long stall (no new best for a quarter of the candidate budget),
 * a finished compaction, and the end of the run. Each reminder is logged in
 * the run folder. The plugin never picks memory items and never writes memory.
 *
 * @module @organon/memory
 */

import { fileURLToPath } from 'node:url'
import { boundContextSummary, createUserMessage } from '@deepseek-ai/dsh-llm'
import { createMemory, settingsFrom } from './memory.js'

export const name = 'organon-memory'
export const inject = ['systemPrompt', 'workingDirectory', 'agents']

/** The agent folder: this plugin lives in `agent/plugins/memory/`. */
export const AGENT_DIR = fileURLToPath(new URL('../../../', import.meta.url))

/** Comes after DSH's own sections, so the prompt's reusable prefix stays first. */
const AGENTS_SECTION_ORDER = 11000

/**
 * @param {object} ctx - the plugin context (the Organon preset's scope).
 * @param {{ stallFraction?: number }} [config]
 */
export function apply(ctx, config) {
  const memory = createMemory({
    agentDir: AGENT_DIR,
    settings: settingsFrom(config),
    workingDirectory: ctx.workingDirectory,
    agents: ctx.agents,
    logger: ctx.logger,
    createMessage: (text, cue) => createUserMessage({
      content: [{ type: 'text', text }],
      source: { kind: 'memory', form: 'notice', summary: boundContextSummary(`Memory (trigger: ${cue})`) },
    }),
  })

  ctx.systemPrompt.section({
    name: 'organon:agents-md',
    order: AGENTS_SECTION_ORDER,
    interpolate: false,
    text: () => memory.agentsText(),
  })

  ctx.on('tools/result', (exec, result) => memory.onToolResult(exec, result))
  ctx.on('session/event', (session, event) => memory.onSessionEvent(session, event))
}
