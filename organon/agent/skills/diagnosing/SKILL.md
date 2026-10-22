---
name: diagnosing
description: Use when you need to know what is going wrong in a search and why - between chunks when a ledger expectation failed or a gain surprised you, when progress stalls, failures jump or one pattern repeats across candidates, on the baseline at task start, and in the self-review at run end. Turns evidence from rows, evaluations, reports and worker transcripts into a cause, the capability that owns the fix, and a change you can test.
---

# Diagnosing

A diagnosis finds where budget goes without result, why, and which of your capabilities owns the fix. It ends in a claim you test: a line in the change ledger (`running-a-task/references/diagnose.md`, "Measure your changes"). Diagnosis decides what you change, so a wrong diagnosis makes careful testing useless. The fix it leads to may be a capability that does not exist yet: build it (`managing-capabilities`).

## When, and how deep

- **Every chunk, a quick scan:** the chunk summary, the share of failures, the first lines of the reports, and the ledger lines due for a verdict. Its only job is to notice something.
- **A deep diagnosis** when a ledger expectation failed or a gain surprised you; when nothing has beaten the best by more than the gain floor for a stretch of the budget; when failures jump; when the same pattern shows in three or more candidates; when time or cost is far from what you expected. Also on the baseline at task start, and for the self-review at run end.
- **A deep diagnosis can go to a support worker** (the `diagnostician` example in `managing-capabilities/references/presets.md`), which keeps long transcripts out of your context. Copy the rows, evaluations, reports and transcripts it needs into its folder. Before you act on its findings, open two or three of the sources it cites yourself.

## What a diagnosis contains

A diagnosis that leads to a change becomes that change's ledger line, with these fields before the usual `change`, `expect`, `test` and `verdict` (the example is in `diagnose.md`). One that leads to no change goes into `scratch/decisions.md` with the same content.

| Field | Holds |
|---|---|
| `trigger` | what made you look |
| `pattern` | what recurs, and in how many candidates |
| `evidence` | candidate ids, with the lines of reports, evaluation logs or transcripts that show it |
| `contrast` | candidates under similar conditions where it did not happen, and where the two first diverge |
| `cause` | why it happens |
| `cause_check` | what the cause predicts in data you already have, and what you found there |
| `owner` | the capability that owns the fix (`references/owners.md`) |
| `at_risk` | what works now that the fix touches, and could break |

## Rules

1. **Raw evidence over summaries.** Open the reports, evaluation logs and transcripts (`references/evidence.md`). The first line of a report is where you start looking, not what you diagnose from; summaries drop the detail a diagnosis needs.
2. **A pattern, not an anecdote.** Act on what several candidates show. One striking case is something to watch.
3. **A contrast.** Compare candidates where it went wrong with candidates under similar conditions where it did not: children of one parent, attempts with the same preset. Find the earliest point where they diverge. A failure alone shows a symptom; only a contrast suggests what would do better.
4. **The root, not the loudest error.** A visible error, such as a compile error or a timeout, can be the end of a chain that started earlier: a wrong reading of the task, a missing check, time spent on something else.
5. **Check the cause before you build the fix.** A cause predicts something you can look for in the rows, logs or transcripts you already have. Look. Building the wrong fix costs budget; checking costs minutes.
6. **Look up what was tried.** Before you choose a fix, search the change bank (`memory/changes.jsonl`) and the lessons for the same `pattern` or `owner`. A fix that was `hurt` or `no effect` before needs an answer to its `why_not`, or a different owner.
7. **Your own setup first.** Before you blame the workers or the task, check what you gave them: presets, staged files, the first message (see the bad example in `running-a-task/references/end.md`).
8. **Name the owner, and prefer the cheapest form that works** (`references/owners.md`): a mechanism that acts on what workers see and do over advice in prose, and an addition over a rewrite of something that works.
9. **Name what could break.** A fix aimed at one failure often changes candidates that were fine. Say which ones in `at_risk`, and look at them in the verdict.
10. **More compute is not a mechanism.** When a fix gives workers more time, more attempts or more evaluations, compare it with the old setup given the same amount.
11. **Plausible is not proven.** A diagnosis is a hypothesis until its ledger line has a verdict.

## When a fix does not help

A verdict other than `helped` also gets `why_not`, so a right diagnosis is not dropped with a wrong fix:

| `why_not` | Means | Next |
|---|---|---|
| `cause wrong` | the evidence contradicts the cause | diagnose again from the evidence |
| `fix wrong` | the cause held, the fix did not address it | another fix for the same cause |
| `not applied` | the workers never used the fix (check their transcripts) | make the fix reach them: where it is staged, how it is said, a mechanism instead of advice |
| `too little evidence` | the test could not tell | a larger or matched test, or leave it |

When a pattern survives two fixes at the same owner, roll the fixes back and look for the cause at a different owner.

## Read next

| Need | File |
|---|---|
| Where each kind of evidence is and how far to trust it; reading worker transcripts | `references/evidence.md` and `scripts/transcript.mjs` |
| Which capability owns which behaviour; which forms of fix tend to work | `references/owners.md` |
| Patterns seen before, with their checks, causes and the fixes tried | `references/patterns.md` |

These files live in this skill's base directory, which the `skill` tool reported.

## Learning across runs

At the end of each run its ledger lines go into the change bank (the `memory` skill). A pattern → cause → fix that the bank shows earning `helped` becomes a process lesson, citing those lines. Once it is supported across runs, it moves into `references/patterns.md` and the lesson becomes compiled. This skill is yours to change like any other; record changes to it in the history entry.
