import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import { budgetUsed, folderOf, nextId, readRows, ROWS_FILE, writeRows } from '../src/rows.js'

let root
afterEach(() => { if (root) rmSync(root, { recursive: true, force: true }) })
const fresh = () => (root = mkdtempSync(join(tmpdir(), 'rows-')))

describe('rows', () => {
  it('reads a missing file as an empty archive', async () => {
    expect(await readRows(fresh())).toEqual([])
  })

  it('writes one JSON object per line, id first, and reads them back', async () => {
    fresh()
    const row = { parents: ['c000000'], score: 3 }
    row.id = 'c000001'
    await writeRows(root, [{ id: 'c000000', score: 1 }, row])
    const text = readFileSync(join(root, ROWS_FILE), 'utf8')
    expect(text).toBe('{"id":"c000000","score":1}\n{"id":"c000001","parents":["c000000"],"score":3}\n')
    expect(await readRows(root)).toEqual([{ id: 'c000000', score: 1 }, { id: 'c000001', parents: ['c000000'], score: 3 }])
  })

  it('names the line of a broken row', async () => {
    fresh()
    mkdirSync(join(root, 'search'))
    writeFileSync(join(root, ROWS_FILE), '{"id":"c000000"}\n{broken\n')
    await expect(readRows(root)).rejects.toThrow(/line 2/)
  })

  it('gives the next id above every row and every candidate folder', async () => {
    fresh()
    expect(await nextId(root, [])).toBe('c000000')
    expect(await nextId(root, [{ id: 'c000000' }, { id: 'c000004' }, { id: 'odd' }])).toBe('c000005')
    mkdirSync(join(root, 'search', 'candidates', 'c000009'), { recursive: true })
    expect(await nextId(root, [{ id: 'c000004' }])).toBe('c000010')
  })

  it('counts every candidate but the baseline against the budget', () => {
    expect(budgetUsed([{ id: 'c000000' }, { id: 'c000001' }, { id: 'c000002', error: 'x' }])).toBe(2)
  })

  it('finds a candidate folder from its row, or by convention', () => {
    expect(folderOf({ folder: 'elsewhere/c1' }, 'c000001')).toBe('elsewhere/c1')
    expect(folderOf(undefined, 'c000000')).toBe('search/candidates/c000000')
  })
})
