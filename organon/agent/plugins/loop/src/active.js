/**
 * The active setup of a run, `search/active.json`: the strategy chosen for
 * each slot, the search method they came from (null once customized), and
 * per-slot settings that override the strategy files' own settings.
 *
 * @module @organon/loop/active
 */

import { access, mkdir, readFile, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { loadMethod } from './strategies.js'

export const ACTIVE_FILE = 'search/active.json'
export const DEFAULT_METHOD = 'population-evolution'
/** L₀: population evolution, with the default Var. */
export const DEFAULT_SLOTS = Object.freeze({ loop: 'refill', sel: 'rank', var: 'default', eval: 'single', surv: 'top-k' })

/** `evolve_use` arguments that are not slot names. */
const OPTIONS = new Set(['method', 'preset', 'settings'])

/**
 * @typedef {object} Active
 * @property {string | null} method
 * @property {Record<string, string>} slots - slot name → strategy name.
 * @property {Record<string, object>} settings - slot name → setting overrides.
 */

/**
 * The run's active setup; L₀ before `evolve_use` was first called.
 * @param {string} root - the run folder.
 * @returns {Promise<Active>}
 */
export async function readActive(root) {
  let active
  try {
    active = JSON.parse(await readFile(join(root, ACTIVE_FILE), 'utf8'))
  } catch (error) {
    if (error?.code === 'ENOENT') return { method: DEFAULT_METHOD, slots: { ...DEFAULT_SLOTS }, settings: {} }
    throw new Error(`${ACTIVE_FILE} is not valid JSON: ${error.message}`)
  }
  return { method: active.method ?? null, slots: { ...active.slots }, settings: { ...active.settings } }
}

/**
 * @param {string} root - the run folder.
 * @param {Active} active
 */
export async function writeActive(root, active) {
  const file = join(root, ACTIVE_FILE)
  await mkdir(dirname(file), { recursive: true })
  await writeFile(file, `${JSON.stringify(active, null, 2)}\n`)
}

/**
 * Apply one `evolve_use` call: the method first, then explicit slot names
 * (any key other than `method`, `preset` and `settings`; null removes an
 * added slot), then the `preset` shortcut for `settings.var.preset`, then
 * `settings.<slot>`, merged into that slot's overrides.
 * @param {Active} active
 * @param {object} args - the tool arguments.
 * @param {string} dir - the strategies folder.
 * @returns {Promise<Active>}
 */
export async function applyUse(active, args, dir) {
  const next = {
    method: active.method,
    slots: { ...active.slots },
    settings: Object.fromEntries(Object.entries(active.settings).map(([slot, value]) => [slot, { ...value }])),
  }

  let methodSlots
  if (args.method !== undefined) {
    methodSlots = await loadMethod(dir, args.method)
    next.method = args.method
    for (const [slot, name] of Object.entries(methodSlots)) {
      await requireStrategy(dir, slot, name)
      next.slots[slot] = name
    }
  }

  for (const [slot, name] of Object.entries(args)) {
    if (OPTIONS.has(slot) || name === undefined) continue
    if (name === null) {
      delete next.slots[slot]
      continue
    }
    if (typeof name !== 'string' || name === '') throw new Error(`the strategy for slot "${slot}" must be a name`)
    await requireStrategy(dir, slot, name)
    next.slots[slot] = name
  }

  if (args.preset !== undefined) next.settings.var = { ...next.settings.var, preset: args.preset }
  for (const [slot, values] of Object.entries(args.settings ?? {})) {
    if (values === null || typeof values !== 'object' || Array.isArray(values)) {
      throw new Error(`settings.${slot} must be an object of settings`)
    }
    next.settings[slot] = { ...next.settings[slot], ...values }
  }

  // A method stays named only while every slot it defines still uses its strategy.
  if (next.method !== null) {
    methodSlots ??= await loadMethod(dir, next.method).catch(() => undefined)
    const intact = methodSlots !== undefined
      && Object.entries(methodSlots).every(([slot, name]) => next.slots[slot] === name)
    if (!intact) next.method = null
  }
  return next
}

async function requireStrategy(dir, slot, name) {
  try {
    await access(join(dir, slot, `${name}.js`))
  } catch {
    throw new Error(`no ${slot} strategy "${name}": ${join(dir, slot, `${name}.js`)} does not exist`)
  }
}
