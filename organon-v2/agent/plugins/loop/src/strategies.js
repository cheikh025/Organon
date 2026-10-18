/**
 * Strategy files in `agent/evolve/`: one folder per slot (`loop/`, `sel/`,
 * `var/`, `eval/`, `surv/`, and any slot the agent adds), one `<name>.js` per
 * strategy, and `methods/<name>.json` naming a strategy for some slots.
 *
 * A strategy file exports one function as its default export, optional
 * `settings`, and, for a Sel that picks a whole batch at once, `batch = true`.
 * Files are imported again when they change on disk, so an edit applies at
 * the next chunk. Strategies have no versions: an edited file keeps its name.
 *
 * @module @organon/loop/strategies
 */

import { readdir, readFile, stat } from 'node:fs/promises'
import { join } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

export const METHODS_DIR = 'methods'

/**
 * The folder of strategy files, `agent/evolve/`. This plugin lives in
 * `agent/plugins/loop/`, so the folder is found from this file's own
 * location, wherever the agent folder is.
 * @returns {string}
 */
export function evolveDir() {
  return fileURLToPath(new URL('../../../evolve', import.meta.url))
}

/**
 * Import one strategy. The file's modification time is part of the import
 * URL, so an edited file is loaded afresh and an unchanged one is reused.
 * @param {string} dir - the strategies folder.
 * @param {string} slot
 * @param {string} name
 * @returns {Promise<{ slot: string, name: string, run: Function, settings: object, batch: boolean }>}
 */
export async function loadStrategy(dir, slot, name) {
  const file = join(dir, slot, `${name}.js`)
  let info
  try {
    info = await stat(file)
  } catch (error) {
    if (error?.code === 'ENOENT') throw new Error(`no ${slot} strategy "${name}": ${file} does not exist`)
    throw error
  }
  const module = await import(`${pathToFileURL(file).href}?mtime=${info.mtimeMs}`)
  if (typeof module.default !== 'function') {
    throw new Error(`${file} must export its strategy function as the default export`)
  }
  return {
    slot,
    name,
    run: module.default,
    settings: module.settings !== null && typeof module.settings === 'object' ? module.settings : {},
    batch: module.batch === true,
  }
}

/**
 * Read a search method: the strategy it names for each slot it defines.
 * @param {string} dir - the strategies folder.
 * @param {string} name
 * @returns {Promise<Record<string, string>>}
 */
export async function loadMethod(dir, name) {
  const file = join(dir, METHODS_DIR, `${name}.json`)
  let method
  try {
    method = JSON.parse(await readFile(file, 'utf8'))
  } catch (error) {
    if (error?.code === 'ENOENT') throw new Error(`no search method "${name}": ${file} does not exist`)
    throw new Error(`${file} is not valid JSON: ${error.message}`)
  }
  if (method === null || typeof method !== 'object' || Array.isArray(method)) {
    throw new Error(`${file} must map slot names to strategy names`)
  }
  return method
}

/**
 * Every strategy and method on disk.
 * @param {string} dir - the strategies folder.
 * @returns {Promise<{ slots: Record<string, string[]>, methods: string[] }>}
 */
export async function catalog(dir) {
  const slots = {}
  let methods = []
  let entries = []
  try {
    entries = await readdir(dir, { withFileTypes: true })
  } catch (error) {
    if (error?.code !== 'ENOENT') throw error
  }
  for (const entry of entries) {
    if (!entry.isDirectory()) continue
    const files = await readdir(join(dir, entry.name))
    if (entry.name === METHODS_DIR) {
      methods = files.filter(file => file.endsWith('.json')).map(file => file.slice(0, -5)).sort()
    } else {
      slots[entry.name] = files.filter(file => file.endsWith('.js')).map(file => file.slice(0, -3)).sort()
    }
  }
  return { slots, methods }
}
