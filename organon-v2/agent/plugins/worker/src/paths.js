/**
 * Folder containment for worker confinement: resolve a path through any
 * existing symlinks or junctions, then check that it stays inside the
 * worker's folder.
 *
 * @module @organon/worker/paths
 */

import { realpathSync } from 'node:fs'
import { basename, dirname, isAbsolute, relative, resolve, sep } from 'node:path'

/**
 * Resolve a path to its canonical form. The nearest existing ancestor is
 * resolved through the filesystem, so a link inside the folder that points
 * outside it is followed; segments that do not exist yet are appended as given.
 * @param {string} path - absolute or relative path.
 * @returns {string} the canonical absolute path.
 */
export function canonical(path) {
  let current = resolve(path)
  const missing = []
  for (;;) {
    try {
      return resolve(realpathSync.native(current), ...missing)
    } catch (error) {
      if (error?.code !== 'ENOENT' && error?.code !== 'ENOTDIR') throw error
      const parent = dirname(current)
      if (parent === current) return resolve(path)
      missing.unshift(basename(current))
      current = parent
    }
  }
}

/**
 * Whether `path` is `root` itself or lies under it. Both must already be
 * canonical; on Windows the comparison is case-insensitive.
 * @param {string} root - canonical folder.
 * @param {string} path - canonical path to test.
 * @returns {boolean}
 */
export function isInside(root, path) {
  const rel = relative(root, path)
  return rel === '' || (rel !== '..' && !rel.startsWith(`..${sep}`) && !isAbsolute(rel))
}
