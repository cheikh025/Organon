# Independent memory audits

When facts, lessons or insights have grown hard to manage, a fresh support worker audits them (the memory skill, "Caps and reviews", says when). It starts with nothing but its folder, its preset and its first message, so this file says what to give it, what it checks, when each action is right, and what it returns.

## Setting it up

- **One kind per auditor.** The worker's folder is the folder of the kind it audits: `agent/memory/lessons/`, `agent/memory/facts/` or `agent/memory/insights/`. It edits those files directly; it can write nowhere else, so the change bank and the history entries stay out of its reach. Run auditors for different kinds one after another, or at the same time only when their checks do not depend on each other's results.
- **The preset:** `memory-auditor` (the example in `managing-capabilities/references/presets.md`), or one you have improved.
- **The first message lists the evidence by absolute path.** The worker's file tools cannot read outside its folder; its shell can, so it reads these with shell commands:
  - the rules: `agent/skills/memory/SKILL.md` and `agent/skills/memory/references/formats.md`, and this file;
  - the change bank, `agent/memory/changes.jsonl`;
  - the history entries, `agent/memory/history/`;
  - the runs' `memory-deliveries.jsonl` logs, for the reads and writes behind `uses` and `last_used` (each history entry names its run folder);
  - for insights, the run folders their sources point to, so it can open the cited reports and evaluations;
  - the other kinds of memory, when its checks need them (a lesson that contradicts a fact).
- **Say what made you start it:** which cap was reached, what has become hard to find, what you suspect. It judges for itself; this is where it starts looking.

## What it checks

| Kind | Checks |
|---|---|
| Lessons | Does the status match the evidence? For a lesson about changes, recount the bank lines it cites, under the trust rules. Do two lessons make one claim? Is the condition neither too broad to mean anything ("when stalled") nor too narrow to come up again? Is a supported lesson really a procedure that should be compiled into a skill? Does the bank show a pattern and owner that agree across tasks with no lesson yet? |
| Facts | Is a fact contradicted by a later history entry or bank line? Is it marked "re-verify" after a DSH or model change? Is it duplicated? |
| Insights | Do the cited sources exist and say what the insight claims? Do the `transfer` counts support keeping it? Is the same finding recorded twice? Does one insight cover two situations? Are its `related:` links right? |
| Every kind | "The line": no solution content in facts, lessons, history or overviews. "Describe, never prescribe." The caps. |

## When each action is right

| Action | When | Keep |
|---|---|---|
| **Merge** | two items make the same claim under the same conditions | every source, and the evidence behind the stronger status |
| **Rewrite** | the evidence supports a narrower or different claim than the one written | the original sources; say in the body what changed |
| **Split** | one item mixes two situations with different evidence | each part's own sources |
| **Delete** | the evidence contradicts it; a hypothesis has expired under the trust rules; or it went unused across many runs where its condition came up, and no other item depends on it | nothing: the audit log records it |
| **Add** | only a lesson the bank's lines already support, entered as a hypothesis | the bank lines as its evidence |

Refuted lessons are kept, as the trust rules say; they are knowledge too. Age and use inform a judgment; on their own they do not make an item worthless. The auditor never adds a claim of its own.

## What it returns

An audit log: one entry per item changed, added or deleted, with the action, the reason and the evidence. It writes the log as its closing message.

```text
merged    explore-on-stall + widen-on-low-diversity -> explore-on-stall
          same claim and condition; both sources kept
deleted   eval-time-kernel-builder: contradicted by history/2026-11-02_kernel_builder_01 (40 s -> 95 s)
rewrote   quick-check-untested: condition narrowed to "evaluation over 30 s"; bank lines ch05 (2 runs) helped only there
added     stage-sibling-reports (hypothesis): bank lines in 2 tasks, both matched, both helped
unchanged 23 lessons
```

## After it finishes

Read the log. Update the index in `agent/AGENTS.md` for the items merged, added, renamed or deleted; the auditor cannot reach it. Record the audit's scope and the log's summary in the run's history entry, under "Memory changes".
