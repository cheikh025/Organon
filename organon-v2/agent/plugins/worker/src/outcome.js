/**
 * Reading a finished worker's outcome from its session events, and the
 * completion notice its parent receives. The notice uses DSH's wording for a
 * one-shot subagent.
 *
 * @module @organon/worker/outcome
 */

/**
 * Why the worker's run ended, from its last `turn/end` event. Same mapping as
 * DSH's subagent results.
 * @param {readonly object[]} events - the worker's events since its brief.
 * @returns {'completed' | 'aborted' | 'error' | 'max-tokens' | 'refusal'}
 */
export function stopReasonOf(events) {
  let end
  for (const event of events) if (event.type === 'turn/end') end = event
  switch (end?.data?.reason?.kind) {
    case undefined:
    case 'completed':
      return 'completed'
    case 'max-tokens':
      return 'max-tokens'
    case 'aborted':
    case 'interrupted':
      return 'aborted'
    case 'blocked':
      return 'refusal'
    default:
      return 'error'
  }
}

/**
 * The text of a content-block list.
 * @param {readonly object[] | undefined} blocks
 * @returns {string}
 */
export function textOf(blocks) {
  return (blocks ?? [])
    .filter(block => block?.type === 'text' && typeof block.text === 'string')
    .map(block => block.text)
    .join('')
}

/**
 * The one-line summary of a finished worker, as DSH words it for a subagent
 * that cannot receive follow-up messages.
 * @param {string} id - the worker's id.
 * @param {string} stopReason
 * @returns {string}
 */
export function summaryOf(id, stopReason) {
  const subject = `Background subagent ${id}`
  switch (stopReason) {
    case 'completed':
      return `${subject} finished. It cannot receive follow-up messages.`
    case 'aborted':
      return `${subject} was stopped before it finished.`
    case 'max-tokens':
      return `${subject} ran out of room before it finished.`
    case 'refusal':
      return `${subject} declined the task.`
    case 'error':
      return `${subject} failed before it finished.`
    default:
      return `${subject} ended abnormally (${String(stopReason)}) before it finished.`
  }
}

/**
 * The content of the completion notice: the summary, then the worker's
 * closing message.
 * @param {string} id - the worker's id.
 * @param {string} stopReason
 * @param {readonly object[] | undefined} closing - the worker's last message.
 * @returns {{ summary: string, content: object[] }}
 */
export function noticeOf(id, stopReason, closing) {
  const summary = summaryOf(id, stopReason)
  const text = (closing ?? []).filter(block => block?.type === 'text' && block.text.length > 0)
  return {
    summary,
    content: [
      { type: 'text', text: summary },
      ...text.length === 0
        ? [{ type: 'text', text: 'It left no closing message.' }]
        : [{ type: 'text', text: 'Its closing message:' }, ...text],
    ],
  }
}
