/**
 * The candidate rows: `search/candidates.jsonl`, one schema-free JSON object
 * per line, rewritten whole after each change. Ids are `c000000`, `c000001`, …
 * and `c000000` is the task's starting program.
 *
 * @module @organon/loop/rows
 */

import { mkdir, readdir, readFile, rename, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'

export const ROWS_FILE = 'search/candidates.jsonl'
export const CANDIDATES_DIR = 'search/candidates'
export const BASELINE_ID = 'c000000'

const ID = /^c(\d{6,})$/

/**
 * Read every row. A missing file is an empty archive.
 * @param {string} root - the run folder.
 * @returns {Promise<object[]>}
 */
export async function readRows(root) {
  let text
  try {
    text = await readFile(join(root, ROWS_FILE), 'utf8')
  } catch (error) {
    if (error?.code === 'ENOENT') return []
    throw error
  }
  const rows = []
  for (const [index, line] of text.split(/\r?\n/).entries()) {
    if (line.trim() === '') continue
    try {
      rows.push(JSON.parse(line))
    } catch (error) {
      throw new Error(`${ROWS_FILE} line ${index + 1} is not valid JSON: ${error.message}`)
    }
  }
  return rows
}

/**
 * Replace the file with these rows, through a temporary file so a crash never
 * leaves it half written. Each row is written with its id first.
 * @param {string} root - the run folder.
 * @param {readonly object[]} rows
 */
export async function writeRows(root, rows) {
  const file = join(root, ROWS_FILE)
  await mkdir(dirname(file), { recursive: true })
  const temporary = `${file}.${process.pid}.tmp`
  const lines = rows.map(row => JSON.stringify(row.id === undefined ? row : { id: row.id, ...row }))
  await writeFile(temporary, lines.join('\n') + (rows.length > 0 ? '\n' : ''))
  await rename(temporary, file)
}

/**
 * The next free candidate id, above every id in the rows and every folder in
 * `search/candidates/`.
 * @param {string} root - the run folder.
 * @param {readonly object[]} rows
 * @returns {Promise<string>}
 */
export async function nextId(root, rows) {
  let highest = -1
  const consider = (id) => {
    const match = typeof id === 'string' ? ID.exec(id) : null
    if (match) highest = Math.max(highest, Number(match[1]))
  }
  for (const row of rows) consider(row.id)
  try {
    for (const name of await readdir(join(root, CANDIDATES_DIR))) consider(name)
  } catch (error) {
    if (error?.code !== 'ENOENT') throw error
  }
  return `c${String(highest + 1).padStart(6, '0')}`
}

/**
 * Budget units used: one per candidate other than the baseline, whether its
 * worker finished or not.
 * @param {readonly object[]} rows
 * @returns {number}
 */
export function budgetUsed(rows) {
  return rows.filter(row => row.id !== BASELINE_ID).length
}

/**
 * The folder of a candidate, relative to the run folder.
 * @param {object | undefined} row
 * @param {string} id
 * @returns {string}
 */
export function folderOf(row, id) {
  return typeof row?.folder === 'string' ? row.folder : `${CANDIDATES_DIR}/${id}`
}
