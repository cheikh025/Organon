import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { createMemory, DEFAULTS, settingsFrom } from '../src/memory.js'
import { LOG_FILE } from '../src/runs.js'

let base
let agentDir
let workspace
let run

const write = (file, text) => {
  mkdirSync(dirname(file), { recursive: true })
  writeFileSync(file, text)
}

beforeEach(() => {
  base = mkdtempSync(join(tmpdir(), 'memory-plugin-'))
  agentDir = join(base, 'agent')
  workspace = join(base, 'workspace')
  run = join(workspace, 'runs', 'ale_bench', 'ahc026', '2026-10-17_01')
  write(join(agentDir, 'AGENTS.md'), '# Organon\n\nStarting rules.\n')
  write(join(run, 'run.json'), JSON.stringify({ task: 'C:/tasks/ale_bench/ahc026', status: 'running' }))
})
afterEach(() => rmSync(base, { recursive: true, force: true }))

/** The main agent: it collects injected messages and has a current directory. */
function fakeAgent(id = 'main') {
  return { id, messages: [], cwd: run, inject(message) { this.messages.push(message) } }
}

function plugin(agents, settings = DEFAULTS) {
  const warnings = []
  const memory = createMemory({
    agentDir,
    settings,
    workingDirectory: { ensure: async a => a.cwd },
    agents: { get: id => agents.find(a => a.id === id) },
    logger: { warn: message => warnings.push(message) },
    createMessage: (text, cue) => ({ text, cue }),
  })
  const chunk = (agent, stallCount, extra = {}) => memory.onToolResult(
    { name: 'evolve_run', arguments: { k: 5 }, agent },
    { isError: false, value: { stallCount, budget: { limit: 100, used: 50, remaining: 50 }, best: { improved: false }, ...extra } },
  )
  const compaction = (agent, data = {}) => memory.onSessionEvent({ id: agent.id }, { type: 'compaction/end', seq: 1, time: 0, data: { compactionId: 'c1', turn: 3, ...data } })
  const writeFile = (agent, file_path) => memory.onToolResult({ name: 'write', arguments: { file_path }, agent }, { isError: false, value: {} })
  return { memory, chunk, compaction, writeFile, warnings }
}

const cues = agent => agent.messages.map(message => message.cue)
const log = () => readFileSync(join(run, LOG_FILE), 'utf8').trim().split('\n').map(line => JSON.parse(line))

describe('memory plugin', () => {
  it('reminds once no new best has appeared for a quarter of the budget', async () => {
    const agent = fakeAgent()
    const { chunk } = plugin([agent])
    await chunk(agent, 10)
    await chunk(agent, 24)
    expect(agent.messages).toEqual([])
    await chunk(agent, 27)
    expect(cues(agent)).toEqual(['stall'])
    expect(agent.messages[0].text).toContain('No new best for 27 evaluations.')
    expect(agent.messages[0].text).toContain(join(agentDir, 'memory', 'lessons'))
    expect(log()).toEqual([{ time: expect.any(String), cue: 'stall', stallCount: 27 }])
  })

  it('reminds once per stall, and again only after a new best', async () => {
    const agent = fakeAgent()
    const { chunk } = plugin([agent])
    await chunk(agent, 26)
    await chunk(agent, 40)
    await chunk(agent, 70)
    await chunk(agent, 3, { best: { improved: true } })
    await chunk(agent, 28)
    expect(cues(agent)).toEqual(['stall', 'stall'])
    expect(log().map(entry => entry.stallCount)).toEqual([26, 28])
  })

  it('at the end of the budget, reminds about the end only, once', async () => {
    const agent = fakeAgent()
    const { chunk, writeFile } = plugin([agent])
    await chunk(agent, 40, { budget: { limit: 100, used: 100, remaining: 0 } })
    write(join(run, 'run.json'), JSON.stringify({ task: 'x', status: 'done' }))
    await writeFile(agent, 'run.json')
    expect(cues(agent)).toEqual(['task-end'])
    expect(agent.messages[0].text).toMatch(/^Memory \(trigger: task-end\)\. The run is ending\./)
  })

  it('reminds about the end when run.json is set to done or stopped', async () => {
    const agent = fakeAgent()
    const { writeFile } = plugin([agent])
    await writeFile(agent, 'run.json')
    expect(agent.messages).toEqual([])
    write(join(run, 'run.json'), JSON.stringify({ task: 'x', status: 'stopped' }))
    await writeFile(agent, join(run, 'scratch', 'run.json'))
    expect(agent.messages).toEqual([])
    await writeFile(agent, join(run, 'run.json'))
    expect(cues(agent)).toEqual(['task-end'])
  })

  it('after a compaction, reminds what is gone and where the run\'s notes are', async () => {
    const agent = fakeAgent()
    const { compaction } = plugin([agent])
    await compaction(agent)
    await compaction(agent)
    expect(cues(agent)).toEqual(['compaction', 'compaction'])
    expect(agent.messages[0].text).toContain('scratch/plan.md')
  })

  it('stays quiet for other tools, failed calls, failed compactions, unknown sessions, and outside a run', async () => {
    const agent = fakeAgent()
    const { memory, chunk, compaction } = plugin([agent])
    await memory.onToolResult({ name: 'read', arguments: { file_path: 'run.json' }, agent }, { isError: false, value: {} })
    await memory.onToolResult({ name: 'evolve_run', arguments: {}, agent }, { isError: true, error: {} })
    await compaction(agent, { error: 'summary failed' })
    await memory.onSessionEvent({ id: 'someone-else' }, { type: 'compaction/end', data: {} })
    await memory.onSessionEvent({ id: 'main' }, { type: 'compaction/prune', data: {} })
    agent.cwd = workspace
    await chunk(agent, 99)
    await compaction(agent)
    expect(agent.messages).toEqual([])
  })

  it('rebuilds its state from the log after a restart, so no reminder repeats', async () => {
    const agent = fakeAgent()
    const first = plugin([agent])
    await first.chunk(agent, 30)
    await first.chunk(agent, 31, { budget: { limit: 100, used: 100, remaining: 0 } })
    const restarted = fakeAgent()
    const { chunk } = plugin([restarted])
    await chunk(restarted, 35)
    await chunk(restarted, 36, { budget: { limit: 100, used: 100, remaining: 0 } })
    expect(restarted.messages).toEqual([])
  })

  it('logs each read and write of a memory file, so task end can count its use', async () => {
    const agent = fakeAgent()
    const { memory } = plugin([agent])
    const call = (name, args) => memory.onToolResult({ name, arguments: args, agent }, { isError: false, value: {} })
    await call('read', { file_path: join(agentDir, 'memory', 'lessons', 'explore-on-stall.md') })
    await call('edit', { file_path: join(agentDir, 'memory', 'facts', 'reload.md') })
    await call('write', { file_path: join(agentDir, 'memory', 'history', '2026-10-18_kb_01.md') })
    await call('read', { file_path: join(agentDir, 'AGENTS.md') })
    await call('read', { file_path: 'scratch/plan.md' })
    expect(log().map(({ use, item }) => [use, item])).toEqual([
      ['read', 'lessons/explore-on-stall.md'],
      ['write', 'facts/reload.md'],
      ['write', 'history/2026-10-18_kb_01.md'],
    ])
    expect(agent.messages).toEqual([])
  })

  it('logs no memory use outside a run', async () => {
    const agent = fakeAgent()
    agent.cwd = workspace
    const { memory } = plugin([agent])
    await memory.onToolResult({ name: 'read', arguments: { file_path: join(agentDir, 'memory', 'facts', 'x.md') }, agent }, { isError: false, value: {} })
    expect(() => log()).toThrow()
  })

  it('serves AGENTS.md, and nothing when it is missing', () => {
    const { memory } = plugin([])
    expect(memory.agentsText()).toBe('# Organon\n\nStarting rules.\n')
    rmSync(join(agentDir, 'AGENTS.md'))
    expect(memory.agentsText()).toBe('')
  })

  it('logs its own failures instead of breaking DSH', async () => {
    const agent = fakeAgent()
    agent.inject = () => { throw new Error('inject failed') }
    const { compaction, warnings } = plugin([agent])
    await expect(compaction(agent)).resolves.toBeUndefined()
    expect(warnings).toEqual(['organon-memory: inject failed'])
  })
})

describe('settingsFrom', () => {
  it('keeps a valid stall fraction and falls back to the default', () => {
    expect(settingsFrom(undefined)).toEqual(DEFAULTS)
    expect(settingsFrom({ stallFraction: 0.5 })).toEqual({ stallFraction: 0.5 })
    expect(settingsFrom({ stallFraction: 0 })).toEqual(DEFAULTS)
    expect(settingsFrom({ stallFraction: 2 })).toEqual(DEFAULTS)
  })
})
