/**
 * Organon's loop plugin, the core of the search: `evolve_status`,
 * `evolve_use` and `evolve_run` for the run in the main agent's working
 * directory. The search itself is made of strategy files in `agent/evolve/`,
 * one per slot (Loop, Sel, Var, Eval, Surv); the plugin loads the active ones
 * for each chunk and makes no search decisions.
 *
 * @module @organon/loop
 */

import { defineTool } from '@deepseek-ai/dsh-tools'
import { applyUse, readActive, writeActive } from './active.js'
import { runChunk } from './chunk.js'
import { RUNNER, runEvaluator } from './evaluator.js'
import { readTask } from './run.js'
import { status } from './status.js'
import { evolveDir } from './strategies.js'

export const name = 'organon-loop'
export const inject = ['tools', 'workers', 'workingDirectory', 'subprocess']

const json = value => [{ type: 'text', text: JSON.stringify(value, null, 2) }]

/**
 * Register the loop tools. Config: `python`, the command that runs the
 * evaluator runner (default `python`).
 * @param {object} ctx - the plugin context.
 * @param {{ python?: string }} [config]
 */
export function apply(ctx, config) {
  const python = typeof config?.python === 'string' && config.python !== '' ? config.python : 'python'
  let chunkRunning = false

  const runFolder = (exec) => {
    if (exec.agent === undefined) throw new Error('the loop tools need an agent session')
    return ctx.workingDirectory.ensure(exec.agent, exec.signal)
  }

  ctx.tools.register(defineTool({
    name: 'evolve_status',
    description:
      'Read-only report on the search of the run in your working directory: the candidate budget, the baseline '
      + 'c000000, the best candidate, counts, the stall count (evaluations since the last new best), the active '
      + 'strategy and settings of each slot, the strategy files, methods and presets available, and the command '
      + 'that runs the task\'s evaluator by hand.',
    parameters: {},
    output: { schema: { type: 'json' }, render: (_args, value) => json(value) },
    isConcurrencySafe: () => true,
    async execute(_args, exec) {
      const root = await runFolder(exec)
      const presets = (await ctx.get('agentPresets')?.list())?.map(preset => preset.id) ?? []
      return status({
        root,
        dir: evolveDir(),
        presets,
        runner: `${python} -B "${RUNNER}" "<task folder>" "<program file>"  (prints one JSON line: score, error, metrics)`,
      })
    },
  }))

  ctx.tools.register(defineTool({
    name: 'evolve_use',
    description:
      'Change the search setup used by the next chunks of the run in your working directory, and return the active '
      + 'setup. Your working directory must be the run folder, with its run.json. A slot key (loop, sel, var, eval, surv, or a slot you added) selects the strategy file '
      + 'agent/evolve/<slot>/<name>.js for that slot; null removes an added slot.',
    parameters: {
      method: {
        type: 'string',
        description: 'A search method, agent/evolve/methods/<name>.json, naming a strategy for several slots. Applied before the slot keys.',
      },
      loop: { type: 'string', description: 'Loop strategy: when the other slots run.' },
      sel: { type: 'string', description: 'Sel strategy: what each attempt starts from.' },
      var: { type: 'string', description: 'Var strategy: how each candidate is built.' },
      eval: { type: 'string', description: 'Eval strategy: how each candidate is scored.' },
      surv: { type: 'string', description: 'Surv strategy: which candidates stay selectable.' },
      preset: {
        oneOf: [{ type: 'string' }, { type: 'null' }],
        description: 'The worker preset Var uses; shortcut for settings.var.preset. null removes it, so Var\'s default applies.',
      },
      settings: {
        type: 'object',
        additionalProperties: true,
        description: 'Setting overrides per slot, merged into that slot\'s current overrides, for example { "surv": { "k": 20 } }. '
          + 'null removes an override so the strategy\'s default applies again: { "surv": { "k": null } } for one setting, '
          + '{ "surv": null } for all of a slot\'s.',
      },
    },
    output: { schema: { type: 'json' }, render: (_args, value) => json(value) },
    async execute(args, exec) {
      const root = await runFolder(exec)
      // The setup belongs to a run: outside one it would be written where no chunk reads it.
      await readTask(root)
      const next = await applyUse(await readActive(root), args, evolveDir())
      await writeActive(root, next)
      return next
    },
  }))

  ctx.tools.register(defineTool({
    name: 'evolve_run',
    description:
      'Run one chunk of the search of the run in your working directory, and wait until it ends: up to k new '
      + 'candidates, built, scored and kept by the active strategies, capped by the remaining budget. Returns the '
      + 'budget, the best score before and after, one line per new candidate, and the alive pool.',
    parameters: {
      k: { type: 'integer', required: true, description: 'How many attempts this chunk may make.' },
    },
    output: { schema: { type: 'json' }, render: (_args, value) => renderChunk(value) },
    async execute(args, exec) {
      if (chunkRunning) throw new Error('a chunk is already running')
      chunkRunning = true
      try {
        const root = await runFolder(exec)
        return await runChunk({
          root,
          dir: evolveDir(),
          k: args.k,
          agent: exec.agent,
          signal: exec.signal,
          workers: ctx.workers,
          evaluate: (task, folder, signal) => runEvaluator({
            subprocess: ctx.subprocess,
            sandbox: ctx.get('sandbox'),
            python,
            task,
            folder,
            sessionId: exec.agent.session.id,
            signal,
          }),
        })
      } finally {
        chunkRunning = false
      }
    },
  }))
}

/**
 * The chunk summary as the main agent reads it.
 * @param {object} summary
 * @returns {object[]}
 */
export function renderChunk(summary) {
  const { attempts, budget, best } = summary
  const score = row => (row === null ? 'none' : `${row.id} ${row.score}`)
  const lines = [
    `Chunk: ${attempts.created} new candidates (${attempts.valid} valid, ${attempts.broken} broken) in ${summary.seconds} s; `
    + `budget ${budget.used} of ${budget.limit} used, ${budget.remaining} left.`,
    best.improved
      ? `Best: ${score(best.after)}, up from ${score(best.before)}.`
      : `Best: ${score(best.after)}, unchanged (${summary.stallCount} evaluations since the last new best).`,
  ]
  for (const row of summary.candidates) {
    const result = row.error !== null ? `error: ${row.error}` : row.score !== null ? `score ${row.score}` : 'not scored'
    lines.push(`${row.id}  from ${row.parents.join(', ') || 'scratch'}  ${row.preset ?? '-'}  ${result}  `
      + `${row.alive ? 'alive' : '-'}${row.report === '' ? '' : `  | ${row.report}`}`)
  }
  lines.push(`Alive: ${summary.alive.map(row => `${row.id} ${row.score} (${row.children} children)`).join(', ') || 'none'}`)
  if (summary.loop !== undefined) lines.push(`Loop: ${typeof summary.loop === 'string' ? summary.loop : JSON.stringify(summary.loop)}`)
  return [{ type: 'text', text: lines.join('\n') }]
}
