import { spawn as spawnChild } from 'node:child_process'
import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { Strategies } from '../src/registry.js'

/** The agent's strategies folder, `agent/evolve/`. */
export const EVOLVE = join(dirname(fileURLToPath(import.meta.url)), '..', '..', '..', 'evolve')

/** The L₀ strategy plugins, by slot. */
export const L0_FILES = Object.freeze({
  loop: 'loop/refill.js', sel: 'sel/rank.js', var: 'var/default.js', eval: 'eval/single.js', surv: 'surv/top-k.js',
})
export const L0_NAMES = Object.freeze({ loop: 'refill', sel: 'rank', var: 'default', eval: 'single', surv: 'top-k' })

/** A stand-in for the plugin context a strategy plugin gets: the `evolve` service and `effect`. */
export const pluginContext = strategies => ({ evolve: strategies, effect: execute => execute() })

/**
 * The `evolve` service with the L₀ plugins applied, each with its row config
 * from `config`, except the slots in `replace`; each entry there registers
 * `{ name, run, settings?, batch? }` in its slot instead (null leaves it empty).
 * @returns {Promise<Strategies>}
 */
export async function registerL0({ config = {}, replace = {} } = {}) {
  const strategies = new Strategies()
  for (const [slot, file] of Object.entries(L0_FILES)) {
    if (slot in replace) continue
    const plugin = await import(pathToFileURL(join(EVOLVE, file)).href)
    plugin.apply(pluginContext(strategies), config[slot])
  }
  for (const [slot, entry] of Object.entries(replace)) {
    if (entry === null) continue
    const { name, run, ...options } = entry
    strategies.strategy(slot, name, run, options)
  }
  return strategies
}

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
