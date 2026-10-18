import { describe, expect, it } from 'vitest'
import { noticeOf, stopReasonOf, summaryOf, textOf } from '../src/outcome.js'

const end = kind => ({ type: 'turn/end', data: { reason: { kind } } })

describe('stopReasonOf', () => {
  it('maps the last turn/end like DSH subagent results', () => {
    expect(stopReasonOf([end('completed')])).toBe('completed')
    expect(stopReasonOf([])).toBe('completed')
    expect(stopReasonOf([end('aborted')])).toBe('aborted')
    expect(stopReasonOf([end('interrupted')])).toBe('aborted')
    expect(stopReasonOf([end('max-tokens')])).toBe('max-tokens')
    expect(stopReasonOf([end('blocked')])).toBe('refusal')
    expect(stopReasonOf([end('error')])).toBe('error')
    expect(stopReasonOf([end('something-new')])).toBe('error')
  })

  it('uses the last turn/end', () => {
    expect(stopReasonOf([end('error'), { type: 'assistant/message' }, end('completed')])).toBe('completed')
  })
})

describe('textOf', () => {
  it('joins text blocks and ignores the rest', () => {
    expect(textOf([{ type: 'text', text: 'a' }, { type: 'reasoning', text: 'x' }, { type: 'text', text: 'b' }])).toBe('ab')
    expect(textOf(undefined)).toBe('')
  })
})

describe('notice', () => {
  it('uses DSH wording for a subagent that cannot receive follow-ups', () => {
    expect(summaryOf('w1', 'completed')).toBe('Background subagent w1 finished. It cannot receive follow-up messages.')
    expect(summaryOf('w1', 'aborted')).toBe('Background subagent w1 was stopped before it finished.')
    expect(summaryOf('w1', 'error')).toBe('Background subagent w1 failed before it finished.')
  })

  it('carries the closing message, or says there is none', () => {
    expect(noticeOf('w1', 'completed', [{ type: 'text', text: 'Done: faster IO.' }]).content).toEqual([
      { type: 'text', text: 'Background subagent w1 finished. It cannot receive follow-up messages.' },
      { type: 'text', text: 'Its closing message:' },
      { type: 'text', text: 'Done: faster IO.' },
    ])
    expect(noticeOf('w1', 'error', []).content.at(-1)).toEqual({ type: 'text', text: 'It left no closing message.' })
  })
})
