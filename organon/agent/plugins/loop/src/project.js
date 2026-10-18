/**
 * Copying a candidate's project: its folder, keeping only the paths that also
 * exist in a reference folder (normally the task folder). Files a worker
 * added, and the notes Var writes for an attempt, are left behind, so what
 * is evaluated and what children start from is the task's files as changed.
 * The runs folder, `.organon/` at the top of the task folder, is never part
 * of a project.
 *
 * @module @organon/loop/project
 */

import { existsSync } from 'node:fs'
import { copyFile, mkdir, readdir } from 'node:fs/promises'
import { join } from 'node:path'

/** Where runs live inside a task folder. */
export const RUNS_DIR = '.organon'

/**
 * Copy `from` into `to`, keeping only paths that exist under `reference`,
 * and never the runs folder. The walk is explicit because a run's candidates
 * live inside the task folder they copy.
 * @param {string} from - absolute folder to copy.
 * @param {string} to - absolute destination folder.
 * @param {string} [reference] - absolute folder whose paths are kept; everything when absent.
 */
export async function copyProject(from, to, reference = from) {
  await mkdir(to, { recursive: true })
  for (const entry of await readdir(from, { withFileTypes: true })) {
    if (entry.name === RUNS_DIR) continue
    if (!existsSync(join(reference, entry.name))) continue
    if (entry.isDirectory()) {
      await copyProject(join(from, entry.name), join(to, entry.name), join(reference, entry.name))
    } else if (entry.isFile()) {
      await copyFile(join(from, entry.name), join(to, entry.name))
    }
  }
}
