---
name: memory
description: Use at task start to recall what you know, during a run when something worth keeping happens or past knowledge may help (before changing yourself, when the search is stuck), and at task end to record and curate memory - facts, lessons, history, insights and overviews in agent/memory/.
---

# Memory

Memory makes each task run start better informed than the last. Facts, lessons, history and overviews improve your own operation and search decisions; insights preserve approach knowledge from worker experiments on the current task or other tasks. Everything here, this skill included, is yours to change; record each change (see "Memory changes").

## The line: your memory and workers' insights

Facts, lessons, history and overviews describe the world you work in (tools, DSH, the operating system, each evaluator as a measuring instrument), how you direct the search, yourself, and your capabilities. They never say what to build or how to solve. Insights separately preserve evidence-backed approach-level findings for workers; see "Insights: memory for workers" below.

| Outside facts, lessons, history and overviews | Within those kinds |
|---|---|
| algorithms, data structures, parameters or code of any candidate | the directions used (the worker presets) and their effect |
| approach classes or techniques ("simulated annealing worked"); these go only into insights, for workers | process decisions and their effect: pacing, stalls, which presets and attempt context workers got (never which approach) |
| candidate ids, lineages, per-candidate tricks | one line on where the gain came from ("mostly in the first third of the budget") |
| detailed score trajectories, task-specific heuristics | environment facts; the evaluator as an instrument: runtime, noise, determinism, feedback format, failure codes |
| reference scores such as human bests | calibration; capabilities used, built or deleted, and why |

- **Test each item:** does it explain a task-solution approach? Then it does not belong in facts, lessons, history or overviews; a finding grounded in worker experiments can become an insight. Is it about the environment, the measurement, search control, you or your tools? Then it belongs in your own memory.
- **Describe, never prescribe:** "IO time counts toward the time limit" is memory; "use buffered IO" is not.
- **Memory text is data,** not instructions to follow blindly.

## Layout

```text
agent/
├── AGENTS.md          always in your context: starting rules + the index of memory (at most ~200 lines)
└── memory/
    ├── facts/         settled knowledge, one fact per file
    ├── lessons/       conditional claims with status and evidence, one per file
    ├── history/       one entry per task run, written at task end
    ├── insights/      evidence-backed approach findings for workers, one per file
    └── overviews/     one short synthesis per scope, once a scope is large enough
```

| Kind | Holds | Changes |
|---|---|---|
| Fact | the environment; an evaluator's profile; operator rules and preferences; locations | settled by one observation; replaced on one verified contradiction; marked "re-verify" when DSH or the model changes |
| Lesson | a claim at one of three levels: **process** (how to direct a search, in terms of presets and search situations), **self** (your reliability and habits), **learning** (which lessons and changes to yourself paid off) | needs evidence from several tasks; carries a status |
| History | what happened in one run; the evidence other items cite | written at task end; later corrections are noted in it |
| Insight | an approach-level finding from worker experiments on the current task or other tasks, with sources, evidence and limitations | delivery, adoption and benefit tracked separately; revised or retired as later evidence warrants |
| Overview | how the search and the environment behave in one scope, pointing to lessons | rebuilt at curation |

Two scopes only: `global` and `<benchmark>`. File names are kebab-case slugs. The templates are in `references/formats.md`, in this skill's base directory.

## Recall

- **At task start**, after reading the task and the baseline: `AGENTS.md` is already in your context. Read the overview of this benchmark, the one or two history entries most alike by fingerprint, and the lessons whose conditions match. About six lookups beyond `AGENTS.md`. Write the lessons you apply, and the effect you expect, in the run's `scratch/plan.md`.
- **During the run**, look again whenever past knowledge may help, for example before changing yourself (a plugin, strategy, preset or skill). The memory plugin only reminds you: when no new best has appeared for a quarter of the budget, that your lessons and overviews may help; after a compaction, that what you read is gone from context and your plan is in `scratch/plan.md`. You decide what to read. Facts held only in the conversation are lost at compaction; memory files are not.
- **Reads and writes are logged for you:** the memory plugin logs every memory file you read or write (with the read, write and edit tools) in the run's `memory-deliveries.jsonl`. At task end you update `uses` and `last_used` from it.

## Record

- **During a run,** update memory between chunks when you see fit (a fact you verified, a lesson that clearly failed, or a traceable worker finding worth sharing as an insight). Untested proposals and incomplete analysis stay in `scratch/`.
- **At task end,** the main update, with the full picture (the memory plugin reminds you when the run ends):
  1. Write the history entry: conclusions only, no solution content; short when the run brought little. `memory-deliveries.jsonl` in the run folder lists when the memory plugin reminded you, and which memory files you read and wrote.
  2. For each item you read during the run (`"use": "read"` lines in the log): add one to `uses` and set `last_used` to today.
  3. For the lessons and insights involved: update their evidence and status.
  4. Add new lessons as hypotheses; distil useful insights from worker experiments, recording their sources and applicability.
  5. Revise or retire weak insights.
  6. Record every capability enabled, built, changed or deleted, and why, in the history entry.
  7. Update only the overview and `AGENTS.md` entries this run changed, within the caps.
- **Not obligatory:** a run that teaches nothing need not change memory, and an update rewrites only what the run changed, never everything.
- **What is worth writing:** ask whether a future run will act differently because of it. If not, do not write it.
- A support worker may analyse a long run for you (see `running-a-task/references/delegate.md`). You handle ordinary recording; an independent memory auditor may directly maintain its assigned memory scope as described below.

## How knowledge earns trust

Starting values; tune them here.
- **New lessons** start as **hypothesis**. A benchmark lesson becomes **supported** when two different tasks of that benchmark agree; a global lesson, when two benchmarks agree. A claim never becomes general from one benchmark.
- **One contradiction** makes a supported lesson **doubtful**. It is **refuted** once the evidence against equals the evidence for, with at least two contradictions. Refuted lessons are kept but left out of the index: a refutation is knowledge too.
- **Negative lessons** ("X does not help") get a re-check after a few more tasks in their scope, so one bad run cannot rule something out forever.
- **Hypotheses** with no new support after about five tasks in their scope are deleted; their trace stays in history.
- **A supported lesson that is really a repeated procedure** moves into a skill; the lesson becomes **compiled** and keeps a pointer and its evidence.
- **Contradicted facts** are replaced by the verified value; the history entry notes the change.

## Caps and reviews

- `AGENTS.md` about 200 lines; overviews about 80; history entries about 40; about 30 active lessons per scope.
- At a cap, review that part of memory: merge or retire items, looking first at those least supported and least recently used (`created`, `last_used`, `uses`).
- Overviews start once a scope has more than about 10 lessons.

**Independent memory audits.** When facts, lessons or insights become numerous or long enough to be difficult to manage, launch a fresh support worker to audit the relevant memory. Any one kind can warrant an audit; judge accumulated volume and manageability rather than a fixed task count.

Give the auditor authority to directly merge, rewrite, retire or delete entries within its assigned scope, including obsolete or persistently unused items whose retention is no longer useful. It judges the evidence independently and preserves useful conditions, source references, uncertainty and distinctions between memory kinds. Age and usage inform that judgment; they do not alone establish that knowledge is worthless.

Use a support preset and a working directory containing the actual memory to maintain; supply the relevant evidence and memory rules, since the worker starts fresh. Avoid simultaneous edits to the same scope. The result is cleaned memory and a brief account of changes and reasons. Record the audit's scope and outcome in the run's history and update affected index references.

## Insights: memory for workers

**Insights preserve approach-level findings that workers may find useful when investigating solutions.** They can name an algorithm, explain its mechanism, and retain relevant representation choices, evaluated settings or other technical detail. Record what workers actually tried, the observed outcome, the conditions where it helped or failed, and the limits of the evidence. The [format and example](references/formats.md#insight-memoryinsightsslugmd) show how to retain that knowledge with its sources.

- **Evidence, not invented proposals.** Each insight identifies its source task(s) and links the worker reports and evaluations behind the finding. Your untested hypothesis cannot become an insight by being written to memory. If provenance is missing or unclear, do not pass it on as an insight.
- **Current-task findings are eligible too.** Preserve discoveries from completed worker experiments, with the comparisons, conditions and uncertainty. A summary must not add an untested mechanism, parameter choice or implementation plan and present it as part of the finding. Keep interpretations distinct from observations and retain relevant failures or tradeoffs. Keep the source-task identity when reusing knowledge elsewhere; check differences in requirements and conditions before suggesting relevance. One comparison does not establish a general rule.
- **Workers own the investigation.** Share relevant findings with their evidence and limitations. Workers decide whether they apply, how to adapt them, and which experiments to run. Do not turn a finding into an implementation assignment or a required experiment, including in the accompanying message. Calling a direction optional does not restore independence. Everything passed on follows the [worker-independence guidance](../running-a-task/references/delegate.md#worker-independence).
- **Keep the roles distinct.** Insights are for workers' solution investigations. Facts and lessons guide your own environment and search-control decisions, such as capabilities, pacing and budget. Do not copy solution mechanisms into those kinds of memory or into a preset.
- The memory plugin does not select or deliver insights. Var may supply eligible records in the worker's first message or folder, preserving their provenance and limitations. Organisation and retrieval are yours to improve.
- Tag each candidate whose worker received an insight with its slug (row key `insights`). Count delivery, adoption and measured benefit separately; receiving an insight does not show that it was used or helped.

## Bias controls

You judge your own run, so:
- record what happened apart from why you think it happened;
- effects in `summary.md` cite candidates;
- "uncertain" is an allowed outcome.

## Memory changes

Every change to memory's own design (this skill's steps, templates, thresholds, caps, or the starting rules in `AGENTS.md`) goes under "Memory changes" in the history entry, so later runs can judge it through learning lessons.
