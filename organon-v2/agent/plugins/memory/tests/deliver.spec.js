import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { compactionMessage, endMessage, stallMessage } from '../src/deliver.js'

describe('reminders', () => {
  it('at a long stall, says where memory may help, with the agent folder\'s paths', () => {
    const agentDir = join('C:', 'clone', 'organon-v2', 'agent')
    expect(stallMessage({ stallCount: 27, agentDir })).toBe(
      'Memory (trigger: stall). No new best for 27 evaluations. Your memory may help: the Lessons section of AGENTS.md, '
      + `the lessons in ${join(agentDir, 'memory', 'lessons')}, and this benchmark's overview in ${join(agentDir, 'memory', 'overviews')}.`,
    )
  })

  it('after a compaction, says what is gone and where the run\'s notes are', () => {
    expect(compactionMessage()).toBe(
      'Memory (trigger: compaction). Your context was compacted: what you read from memory earlier is gone from it, while AGENTS.md is still there. '
      + 'Your plan and the lessons you applied are in scratch/plan.md, your decisions in scratch/decisions.md. Re-read what you need.',
    )
  })

  it('at the end, asks what memory and capabilities should change', () => {
    expect(endMessage()).toBe(
      'Memory (trigger: task-end). The run is ending. Consider what later tasks should keep or change: your memory '
      + '(the history entry, lessons, facts, AGENTS.md; see the memory skill) and your capabilities (skills, plugins, presets, strategies; see managing-capabilities).',
    )
  })
})
