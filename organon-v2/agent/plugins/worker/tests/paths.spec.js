import { mkdirSync, mkdtempSync, rmSync, symlinkSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import { canonical, isInside } from '../src/paths.js'

let base
afterEach(() => { if (base) rmSync(base, { recursive: true, force: true }) })

function folders() {
  base = canonical(mkdtempSync(join(tmpdir(), 'worker-paths-')))
  const root = join(base, 'c000001')
  const sibling = join(base, 'c000002')
  mkdirSync(root)
  mkdirSync(sibling)
  return { root, sibling }
}

describe('isInside', () => {
  it('accepts the folder itself and paths under it', () => {
    const { root } = folders()
    expect(isInside(root, root)).toBe(true)
    expect(isInside(root, join(root, 'solution.cpp'))).toBe(true)
    expect(isInside(root, join(root, 'a', 'b.txt'))).toBe(true)
  })

  it('rejects parents, siblings and names that only share a prefix', () => {
    const { root, sibling } = folders()
    expect(isInside(root, base)).toBe(false)
    expect(isInside(root, sibling)).toBe(false)
    expect(isInside(root, `${root}-other`)).toBe(false)
  })

  it('accepts a file whose name starts with two dots', () => {
    const { root } = folders()
    expect(isInside(root, join(root, '..notes'))).toBe(true)
  })
})

describe('canonical', () => {
  it('resolves paths that do not exist yet against their nearest existing folder', () => {
    const { root } = folders()
    expect(canonical(join(root, 'new', 'file.txt'))).toBe(join(root, 'new', 'file.txt'))
  })

  it('follows a link inside the folder that points outside it', () => {
    const { root, sibling } = folders()
    const link = join(root, 'escape')
    try {
      symlinkSync(sibling, link, 'junction')
    } catch {
      return // links unavailable on this machine
    }
    expect(isInside(root, canonical(join(link, 'solution.cpp')))).toBe(false)
  })
})
