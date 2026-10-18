import { spawn as spawnChild } from 'node:child_process'
import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'

/** A stand-in for DSH's subprocess service, backed by child_process. */
export function fakeSubprocess() {
  const spawned = []
  return {
    spawned,
    resolveExecutable: async command => command,
    spawn(spec) {
      spawned.push(spec)
      const child = spawnChild(spec.argv[0], spec.argv.slice(1), { cwd: spec.cwd, env: { ...process.env, ...spec.env } })
      let stdout = ''
      let stderr = ''
      child.stdout.on('data', chunk => { stdout += chunk })
      child.stderr.on('data', chunk => { stderr += chunk })
      spec.signal?.addEventListener('abort', () => child.kill(), { once: true })
      return {
        collected: { stdout: { readFrom: () => ({ text: stdout }) }, stderr: { readFrom: () => ({ text: stderr }) } },
        done: new Promise(resolveDone => child.on('close', (exitCode, signal) => resolveDone({ exitCode, signal }))),
      }
    },
  }
}

/**
 * Write a strategies folder: `files` maps paths like `sel/rank.js` to their
 * text; a value that is an object is written as JSON.
 */
export function writeEvolve(dir, files) {
  for (const [path, content] of Object.entries(files)) {
    const file = join(dir, path)
    mkdirSync(dirname(file), { recursive: true })
    writeFileSync(file, typeof content === 'string' ? content : JSON.stringify(content))
  }
  return dir
}

/** A strategy file whose default export returns a fixed value. */
export const stub = (body = 'return undefined', extra = '') =>
  `${extra}\nexport default async function strategy(core, arg) { ${body} }\n`
