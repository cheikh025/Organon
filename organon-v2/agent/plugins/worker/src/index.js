/**
 * Organon's worker plugin: provides the `workers` service, used by the
 * search loop, and the `spawn_worker` tool, used by the main agent.
 *
 * A worker is a one-shot agent confined to one folder. It behaves like DSH's
 * spawn subagent except that it can write only in its folder and cannot
 * receive follow-up messages.
 *
 * @module @organon/worker
 */

import { resolve } from 'node:path'
import { defineTool } from '@deepseek-ai/dsh-tools'
import { Workers } from './workers.js'

export const name = 'organon-worker'
export const inject = ['tools', 'agents', 'agentPresets', 'workingDirectory']

/** The worker preset `spawn_worker` uses when the call names none. */
export const DEFAULT_PRESET = 'mutator'

/**
 * Provide the `workers` service and register `spawn_worker`.
 * @param {object} ctx - the plugin context.
 */
export function apply(ctx) {
  const workers = new Workers(ctx)
  ctx.provide('workers', workers)
  ctx.effect(() => () => workers.stopAll())

  ctx.tools.register(defineTool({
    name: 'spawn_worker',
    description:
      'Start a worker: a fresh agent that does one task in one folder. It does not see this conversation, '
      + 'and it can write only inside its folder. This returns at once with the worker\'s id. When the worker '
      + 'finishes, its closing message arrives as a notice. A worker cannot receive follow-up messages. Start '
      + 'independent workers together in one assistant message and continue useful work while they run.',
    parameters: {
      preset: {
        type: 'string',
        description: `Id of the worker preset, which sets how the worker works and which tools it has. `
          + `Omit it to use "${DEFAULT_PRESET}", the default worker preset.`,
      },
      directory: {
        type: 'string',
        required: true,
        description: 'The only folder the worker can write in. Relative paths resolve against your current '
          + 'directory; the folder is created if missing. Put the files it needs there before starting it.',
      },
      brief: {
        type: 'string',
        required: true,
        description: 'Everything the worker needs to know, in one text: the task, what to start from, '
          + 'what we know, the rules, and what to deliver.',
      },
      description: {
        type: 'string',
        required: true,
        description: 'A short label for listings, 3-6 words. The worker does not see it.',
      },
    },
    output: {
      schema: {
        type: 'object',
        additionalProperties: false,
        properties: { id: { type: 'string', required: true, description: 'The worker\'s id.' } },
      },
      render: (_args, value) => [{ type: 'text', text: `started worker ${value.id}` }],
    },
    isConcurrencySafe: () => true,
    async execute(args, exec) {
      if (exec.agent === undefined) throw new Error('spawn_worker requires an agent Session')
      const cwd = await ctx.workingDirectory.ensure(exec.agent, exec.signal)
      exec.signal.throwIfAborted()
      // The tool call ends here; the worker keeps running and reports through
      // the completion notice, so the call's signal does not reach it.
      const { id, done } = await workers.spawn({
        preset: args.preset ?? DEFAULT_PRESET,
        directory: resolve(cwd, args.directory),
        brief: args.brief,
        description: args.description,
        parent: exec.agent,
        notify: true,
      })
      done.catch(() => undefined)
      return { id }
    },
  }))
}
