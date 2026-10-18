/**
 * Copying a candidate's project: its folder, keeping only the paths that also
 * exist in a reference folder (normally the task folder). Files a worker
 * added, and the notes Var writes for an attempt, are left behind, so what
 * is evaluated and what children start from is the task's files as changed.
 *
 * @module @organon/loop/project
 */

import { existsSync } from 'node:fs'
import { cp } from 'node:fs/promises'
import { join, relative } from 'node:path'

/**
 * Copy `from` into `to`, keeping only paths that exist under `reference`.
 * @param {string} from - absolute folder to copy.
 * @param {string} to - absolute destination folder.
 * @param {string} [reference] - absolute folder whose paths are kept; everything when absent.
 */
export async function copyProject(from, to, reference = from) {
  await cp(from, to, {
    recursive: true,
    filter: path => existsSync(join(reference, relative(from, path))),
  })
}
