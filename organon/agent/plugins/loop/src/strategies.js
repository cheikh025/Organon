/**
 * Strategy files in `agent/evolve/`, the `@organon/evolve` bundle: one folder
 * per slot (`loop/`, `sel/`, `var/`, `eval/`, `surv/`, and any slot the agent
 * adds), one `<name>.js` plugin per strategy, each a row of the bundle's
 * `cordis.patch.yml`. DSH loads them; this module only lists the files.
 *
 * @module @organon/loop/strategies
 */

import { readdir } from 'node:fs/promises'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

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
 * Every strategy file on disk, enabled or not, by slot.
 * @param {string} dir - the strategies folder.
 * @returns {Promise<Record<string, string[]>>}
 */
export async function catalog(dir) {
  const slots = {}
  let entries = []
  try {
    entries = await readdir(dir, { withFileTypes: true })
  } catch (error) {
    if (error?.code !== 'ENOENT') throw error
  }
  for (const entry of entries) {
    if (!entry.isDirectory() || entry.name === 'node_modules' || entry.name.startsWith('.')) continue
    const files = await readdir(join(dir, entry.name))
    slots[entry.name] = files.filter(file => file.endsWith('.js')).map(file => file.slice(0, -3)).sort()
  }
  return slots
}
