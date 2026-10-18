/**
 * Worker confinement, applied while DSH creates the worker's Agent and before
 * its first prompt: the worker's preset, its sandbox and approval policy, the
 * tools it may see, and a guard on every tool call.
 *
 * The write boundary itself comes from the session's starting folder, which
 * the caller sets to the worker's folder when it creates the Agent.
 *
 * @module @organon/worker/confine
 */

import { isAbsolute, resolve } from 'node:path'
import { canonical, isInside } from './paths.js'

/**
 * Tools a worker may never run, even when its preset includes them:
 * delegation, and tools that change the host or the search.
 */
export const DENIED_TOOLS = Object.freeze(new Set([
  // delegation
  'subagent',
  'subagent_fork',
  'send_message',
  'interrupt_agent',
  'wait_agent',
  'list_agents',
  'list_subagent_models',
  'workflow',
  'ralph',
  'spawn_teammate',
  'team_task_create',
  'team_task_get',
  'team_task_list',
  'team_task_update',
  'spawn_worker',
  // the host and the search
  'plugin_manager',
  'plugin_market',
  'create_worktree',
  'working_directory',
  'evolve_run',
  'evolve_use',
]))

/** Tool arguments that name a file or directory. */
const PATH_ARGUMENTS = Object.freeze(['file_path', 'path'])

/**
 * Model-facing statement of the worker's scope. Same wording as DSH's
 * delegated-subagent context.
 */
export const WORKER_CONTEXT
  = 'You are a delegated subagent: your permission scope was fixed when you were started and cannot be '
    + 'widened from inside this session — operations that require approval are rejected automatically. '
    + 'When the task needs access beyond that scope, do not retry the denied operation; state the '
    + 'limitation in your reply so the delegating agent can handle it.'

/**
 * Build the guard for one worker. It refuses denied tools by name, and file
 * paths outside the folder. Shell commands are not checked: their writes are
 * confined by DSH's sandbox, and their reads are not restricted.
 * @param {string} root - the worker's canonical folder.
 * @returns {(execution: { name: string, arguments: unknown }) => string | undefined}
 */
export function workerGuard(root) {
  return (execution) => {
    if (DENIED_TOOLS.has(execution.name)) return `${execution.name} is not available to workers.`
    const args = execution.arguments
    if (args === null || typeof args !== 'object') return undefined
    for (const key of PATH_ARGUMENTS) {
      const value = args[key]
      if (typeof value !== 'string' || value === '') continue
      if (!isInside(root, canonical(resolve(root, value)))) {
        return `${JSON.stringify(value)} is outside your folder ${root}. Work only inside your folder.`
      }
    }
    if (execution.name === 'glob' && typeof args.pattern === 'string' && escapes(args.pattern)) {
      return `The glob pattern ${JSON.stringify(args.pattern)} reaches outside your folder ${root}.`
    }
    return undefined
  }
}

/** Whether a glob pattern is absolute or climbs out with `..`. */
function escapes(pattern) {
  return isAbsolute(pattern) || pattern.split(/[\\/]/).includes('..')
}

/**
 * Compose an unpublished worker Agent: mount its preset, record its policy,
 * leave it only its preset's tools, and guard every call.
 * @param {object} childCtx - the worker's scoped context, from the Agent setup hook.
 * @param {object} child - the unpublished worker Agent.
 * @param {{ root: string, preset: string, presets: object }} options - canonical folder,
 *   preset id, and the `agentPresets` service.
 * @returns {Promise<void>}
 */
export async function confine(childCtx, child, { root, preset, presets }) {
  await presets.mount(childCtx, preset)
  child.session.append('agent-preset/selected', { agentPreset: preset })

  // The worker's own policy. The parent's permission preset is never copied,
  // so a full-access parent still gets a confined worker.
  child.session.append('sandbox/mode', { mode: 'workspace-write', source: 'delegation' })
  if (childCtx.get('approval') !== undefined) {
    child.session.append('approval/policy', { policy: 'never', source: 'delegation' })
  }

  // A restriction filters everything the worker inherits, including its
  // preset's tools, so allow exactly the preset's tools: no global tool,
  // including ones registered later, reaches the worker.
  const global = new Set(childCtx.tools.schemas().map(schema => schema.name))
  const own = childCtx.tools.schemas(child)
    .map(schema => schema.name)
    .filter(name => !global.has(name) && name !== 'run_code')
  childCtx.tools.restrict({ allow: own })
  childCtx.tools.guard(workerGuard(root))

  childCtx.systemPrompt.context({
    name: 'worker:delegation',
    order: childCtx.systemPrompt.getContextOrder('SUBAGENT_DELEGATION'),
    text: WORKER_CONTEXT,
  })
}
