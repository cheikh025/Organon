/**
 * Summaries of the rows for `evolve_status` and the chunk summary. A higher
 * score is better; a row is valid when it has a numeric score and no error.
 *
 * @module @organon/loop/stats
 */

/** @param {object} row */
export function isValid(row) {
  return typeof row.score === 'number' && row.error == null
}

/** @param {object} row */
export function isBroken(row) {
  return row.error != null
}

/**
 * The highest-scoring valid row.
 * @param {readonly object[]} rows
 * @returns {object | undefined}
 */
export function best(rows) {
  let top
  for (const row of rows) if (isValid(row) && (top === undefined || row.score > top.score)) top = row
  return top
}

/**
 * @param {readonly object[]} rows
 * @returns {{ total: number, valid: number, broken: number, unscored: number, alive: number }}
 */
export function counts(rows) {
  const valid = rows.filter(isValid).length
  const broken = rows.filter(isBroken).length
  return {
    total: rows.length,
    valid,
    broken,
    unscored: rows.length - valid - broken,
    alive: rows.filter(row => row.alive === true).length,
  }
}

/**
 * Evaluated candidates since the last new best, in id order.
 * @param {readonly object[]} rows
 * @returns {number}
 */
export function stallCount(rows) {
  const evaluated = rows
    .filter(row => isValid(row) || isBroken(row))
    .sort((a, b) => String(a.id).localeCompare(String(b.id)))
  let top = -Infinity
  let since = 0
  for (const row of evaluated) {
    if (isValid(row) && row.score > top) {
      top = row.score
      since = 0
    } else {
      since += 1
    }
  }
  return since
}

/**
 * The first non-empty line of a text, shortened.
 * @param {unknown} text
 * @param {number} [max]
 * @returns {string}
 */
export function firstLine(text, max = 120) {
  const line = typeof text === 'string' ? (text.split(/\r?\n/).find(item => item.trim() !== '') ?? '').trim() : ''
  return line.length > max ? `${line.slice(0, max - 1)}…` : line
}

/**
 * How many rows name this candidate as a parent.
 * @param {readonly object[]} rows
 * @param {string} id
 * @returns {number}
 */
export function childCount(rows, id) {
  return rows.filter(row => Array.isArray(row.parents) && row.parents.includes(id)).length
}
