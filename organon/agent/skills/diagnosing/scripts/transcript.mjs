#!/usr/bin/env node
// Print a worker's session as a timeline: what it did, in order, and where its time went.
//
//   node transcript.mjs <session id | session folder | session file> [--summary] [--full] [--home <DSH_HOME>]
//
// A candidate's row holds its worker's session id in `worker`. DSH keeps each session in
// <DSH_HOME>/sessions/<folder slug>/<session id>/session.v4.jsonl.zstd, a file of concatenated
// zstd frames; Node's zstdDecompressSync reads one frame at a time, so the frames are split here.
//   --summary  only the summary (time per tool, longest calls, closing message)
//   --full     whole texts instead of the first line of each

import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs'
import { homedir } from 'node:os'
import { join } from 'node:path'
import { zstdDecompressSync } from 'node:zlib'

const args = process.argv.slice(2)
const flag = name => args.includes(name)
const option = name => { const i = args.indexOf(name); return i === -1 ? undefined : args[i + 1] }
const target = args.find((a, i) => !a.startsWith('--') && args[i - 1] !== '--home')
if (target === undefined) {
  console.error('usage: node transcript.mjs <session id | session folder | session file> [--summary] [--full] [--home <DSH_HOME>]')
  process.exit(2)
}
const full = flag('--full')
const home = option('--home') ?? process.env.DSH_HOME ?? join(homedir(), '.dsh')

/** The session file for an id, a session folder or a file path. */
function sessionFile(spec) {
  if (existsSync(spec) && statSync(spec).isFile()) return spec
  if (existsSync(spec) && statSync(spec).isDirectory()) {
    const file = join(spec, 'session.v4.jsonl.zstd')
    if (existsSync(file)) return file
  }
  const root = join(home, 'sessions')
  for (const slug of existsSync(root) ? readdirSync(root) : []) {
    const file = join(root, slug, spec, 'session.v4.jsonl.zstd')
    if (existsSync(file)) return file
  }
  throw new Error(`no session ${spec} under ${root}`)
}

/** Byte ranges of the complete zstd frames in a buffer (skippable frames are left out). */
function frames(buf) {
  const out = []
  let at = 0
  while (at + 8 <= buf.length) {
    const magic = buf.readUInt32LE(at)
    if ((magic & 0xfffffff0) === 0x184d2a50) { at += 8 + buf.readUInt32LE(at + 4); continue }
    if (magic !== 0xfd2fb528) throw new Error(`not a zstd frame at byte ${at}`)
    const start = at
    const fhd = buf[at + 4]
    const singleSegment = (fhd >> 5) & 1
    const fcsSize = [singleSegment ? 1 : 0, 2, 4, 8][fhd >> 6]
    at += 5 + (singleSegment ? 0 : 1) + [0, 1, 2, 4][fhd & 3] + fcsSize
    for (let last = 0; !last;) {
      if (at + 3 > buf.length) return out // a torn final frame
      const header = buf[at] | (buf[at + 1] << 8) | (buf[at + 2] << 16)
      last = header & 1
      const type = (header >> 1) & 3
      at += 3 + (type === 1 ? 1 : header >>> 3)
    }
    if ((fhd >> 2) & 1) at += 4
    if (at > buf.length) return out
    out.push([start, at])
  }
  return out
}

const buf = readFileSync(sessionFile(target))
const records = frames(buf)
  .flatMap(([s, e]) => zstdDecompressSync(buf.subarray(s, e)).toString('utf8').split('\n'))
  .filter(line => line.trim() !== '')
  .map(line => JSON.parse(line))

const t0 = records.find(r => typeof r.time === 'number')?.time ?? 0
const clock = ms => { const s = Math.round((ms - t0) / 1000); return `+${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}` }
const secs = ms => `${(ms / 1000).toFixed(1)}s`
const short = text => { const s = String(text ?? '').replace(/\s+/g, ' ').trim(); return full || s.length <= 160 ? s : `${s.slice(0, 159)}…` }
const textOf = content => (Array.isArray(content) ? content : []).filter(p => p.type === 'text').map(p => p.text).join(' ')

const calls = new Map()
const perTool = new Map()
const lines = []
let closing = ''
for (const r of records) {
  const d = r.data ?? {}
  if (r.type === 'assistant/message') {
    const text = textOf(d.message?.content)
    if (text.trim() !== '') { closing = text; lines.push(`${clock(r.time)}  says   ${short(text)}`) }
  } else if (r.type === 'tool/call') {
    calls.set(d.callId, { name: d.name, time: r.time })
    lines.push(`${clock(r.time)}  call   ${d.name} ${short(d.arguments)}`)
  } else if (r.type === 'tool/result') {
    const id = d.toolCallId ?? d.message?.toolCallId
    const call = calls.get(id)
    const took = call ? r.time - call.time : 0
    if (call) {
      const entry = perTool.get(call.name) ?? { count: 0, ms: 0 }
      entry.count += 1
      entry.ms += took
      perTool.set(call.name, entry)
      call.took = took
    }
    const text = textOf(d.message?.content)
    lines.push(`${clock(r.time)}  result ${call?.name ?? '?'} ${secs(took)} ${text.length} chars: ${short(text)}`)
  } else if (r.type === 'job/settled') {
    lines.push(`${clock(r.time)}  job    ${d.kind} ${secs((d.finishedAt ?? r.time) - (d.startedAt ?? r.time))} ${d.status} (${d.detail ?? ''}): ${short(d.label)}`)
  } else if (r.type === 'user/message' || r.type === 'agent/inbox/spliced') {
    const text = textOf(d.content ?? d.message?.content)
    if (text.trim() !== '') lines.push(`${clock(r.time)}  given  ${short(text)}`)
  }
}

if (!flag('--summary')) console.log(lines.join('\n'), '\n')
const end = records.reduce((m, r) => (typeof r.time === 'number' ? Math.max(m, r.time) : m), t0)
const inTools = [...perTool.values()].reduce((sum, e) => sum + e.ms, 0)
console.log(`duration ${secs(end - t0)}, steps ${records.filter(r => r.type === 'step/start').length}, tool calls ${calls.size}`)
console.log(`time in tool calls ${secs(inTools)}, the rest (model turns) ${secs(end - t0 - inTools)}`)
console.log('time per tool:')
for (const [name, e] of [...perTool].sort((a, b) => b[1].ms - a[1].ms)) console.log(`  ${name.padEnd(12)} ${String(e.count).padStart(4)} calls  ${secs(e.ms).padStart(8)}`)
console.log('longest calls:')
for (const c of [...calls.values()].filter(c => c.took !== undefined).sort((a, b) => b.took - a.took).slice(0, 5)) console.log(`  ${clock(c.time)} ${c.name} ${secs(c.took)}`)
console.log(`closing message: ${short(closing)}`)
