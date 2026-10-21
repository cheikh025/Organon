/**
 * Organon's loop plugin, the core of the search: `evolve_status` and
 * `evolve_run` for the run in the main agent's working directory, and the
 * `evolve` service. The search itself is made of strategy plugins in
 * `agent/evolve/`, each registering one strategy for one slot (Loop, Sel,
 * Var, Eval, Surv); the plugin runs the registered ones for each chunk and
 * makes no search decisions.
 *
 * @module @organon/loop
 */

import { defineTool } from '@deepseek-ai/dsh-tools'
import { runChunk } from './chunk.js'
import { RUNNER, runEvaluator } from './evaluator.js'
import { Strategies } from './registry.js'
import { status } from './status.js'
import { evolveDir } from './strategies.js'

export const name = 'organon-loop'
export const inject = ['tools', 'workers', 'workingDirectory', 'subprocess']

const json = value => [{ type: 'text', text: JSON.stringify(value, null, 2) }]

/**
 * Provide the `evolve` service and register the loop tools. Config:
 * `python`, the command that runs the evaluator runner (default `python`).
 * @param {object} ctx - the plugin context.
 * @param {{ python?: string }} [config]
 */
export function apply(ctx, config) {
  const python = typeof config?.python === 'string' && config.python !== '' ? config.python : 'python'
  const strategies = new Strategies()
  ctx.provide('evolve', strategies)
  let chunkRunning = false

  const runFolder = (exec) => {
    if (exec.agent === undefined) throw new Error('the loop tools need an agent session')
    return ctx.workingDirectory.ensure(exec.agent, exec.signal)
  }

  ctx.tools.register(defineTool({
    name: 'evolve_status',
    description:
      'Read-only report on the search of the run in your working directory: the candidate budget, the baseline '
      + 'c000000, the best candidate, counts, the stall count (evaluations since the last new best), the strategy '
      + 'and settings enabled in each slot, the strategy files in agent/evolve/ and the presets available, and the '
      + 'command that runs the task\'s evaluator by hand.',
    parameters: {},
    output: { schema: { type: 'json' }, render: (_args, value) => json(value) },
    isConcurrencySafe: () => true,
    async execute(_args, exec) {
      const root = await runFolder(exec)
      const presets = (await ctx.get('agentPresets')?.list())?.map(preset => preset.id) ?? []
      return status({
        root,
        dir: evolveDir(),
        strategies,
        presets,
        runner: `${python} -B "${RUNNER}" "<task folder>" "<program file>"  (prints one JSON line: score, error, metrics)`,
      })
    },
  }))

  ctx.tools.register(defineTool({
    name: 'evolve_run',
    description:
      'Run one chunk of the search of the run in your working directory, and wait until it ends: up to k new '
      + 'candidates, built, scored and kept by the strategy enabled in each slot, capped by the remaining budget. '
      + 'Returns the budget, the best score before and after, one line per new candidate, and the alive pool.',
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
          strategies: strategies.active(),
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
