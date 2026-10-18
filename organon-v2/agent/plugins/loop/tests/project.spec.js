import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import { copyProject } from '../src/project.js'

let base
afterEach(() => { if (base) rmSync(base, { recursive: true, force: true }) })

const write = (file, text) => {
  mkdirSync(dirname(file), { recursive: true })
  writeFileSync(file, text)
}

describe('copyProject', () => {
  it('copies only the paths that exist in the reference folder, with their new content', async () => {
    base = mkdtempSync(join(tmpdir(), 'project-'))
    const task = join(base, 'task')
    const candidate = join(base, 'c1')
    for (const file of ['program.py', 'lib/helper.py', 'evaluator/evaluator.py']) write(join(task, file), 'original\n')
    for (const file of ['program.py', 'lib/helper.py', 'evaluator/evaluator.py']) write(join(candidate, file), 'changed\n')
    write(join(candidate, 'sweep.py'), 'leftover\n')
    write(join(candidate, 'lib', 'extra.py'), 'leftover\n')
    write(join(candidate, 'report.md'), 'notes\n')

    await copyProject(candidate, join(base, 'copy'), task)
    expect(readFileSync(join(base, 'copy', 'program.py'), 'utf8')).toBe('changed\n')
    expect(readFileSync(join(base, 'copy', 'lib', 'helper.py'), 'utf8')).toBe('changed\n')
    expect(existsSync(join(base, 'copy', 'evaluator', 'evaluator.py'))).toBe(true)
    for (const leftover of ['sweep.py', 'lib/extra.py', 'report.md']) expect(existsSync(join(base, 'copy', leftover)), leftover).toBe(false)
  })

  it('copies everything without a reference', async () => {
    base = mkdtempSync(join(tmpdir(), 'project-'))
    write(join(base, 'a', 'x.txt'), 'x\n')
    await copyProject(join(base, 'a'), join(base, 'b'))
    expect(existsSync(join(base, 'b', 'x.txt'))).toBe(true)
  })
})
