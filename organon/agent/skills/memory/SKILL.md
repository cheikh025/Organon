---
name: memory
description: Use at task start to recall what you know, during a run when something worth keeping happens or past knowledge may help (before changing yourself, when the search is stuck), and at task end to record and curate memory - facts, lessons, history, ideas and overviews in agent/memory/.
---

# Memory

Memory makes each task run start better informed than the last, and makes you better at improving yourself, without carrying solutions between tasks. Everything here, this skill included, is yours to change; record each change (see "Memory changes").

## The line: no solutions

Your memory describes the world you work in (tools, DSH, the operating system, each evaluator as a measuring instrument), how you direct the search, yourself, and your capabilities. It never says what to build or how to solve.

| Never in your memory (it stays in the run folder) | In your memory |
|---|---|
| algorithms, data structures, parameters or code of any candidate | the directions used (the worker presets) and their effect |
| approach classes or techniques ("simulated annealing worked"); these go only into ideas, for workers | process decisions and their effect: pacing, stalls, which presets and attempt context workers got (never which approach) |
| candidate ids, lineages, per-candidate tricks | one line on where the gain came from ("mostly in the first third of the budget") |
| detailed score trajectories, task-specific heuristics | environment facts; the evaluator as an instrument: runtime, noise, determinism, feedback format, failure codes |
| reference scores such as human bests | calibration; capabilities used, built or deleted, and why |

- **Test each item:** would it tell a worker what to build or how to solve the task? Then it is not memory; a reusable hint can become an idea. Is it about the environment, the measurement, search control, you or your tools? Then it belongs.
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
    ├── ideas/         hints for workers, one per file; passed on only as options
    └── overviews/     one short synthesis per scope, once a scope is large enough
```

| Kind | Holds | Changes |
|---|---|---|
| Fact | the environment; an evaluator's profile; operator rules and preferences; locations | settled by one observation; replaced on one verified contradiction; marked "re-verify" when DSH or the model changes |
| Lesson | a claim at one of three levels: **process** (how to direct a search, in terms of presets and search situations), **self** (your reliability and habits), **learning** (which lessons and changes to yourself paid off) | needs evidence from several tasks; carries a status |
| History | what happened in one run; the evidence other items cite | written at task end; later corrections are noted in it |
| Idea | a domain hint for workers, worded as an option | adoption counted from candidate tags; retired when rarely adopted or never helpful |
| Overview | how the search and the environment behave in one scope, pointing to lessons | rebuilt at curation |

Two scopes only: `global` and `<benchmark>`. File names are kebab-case slugs. The templates are in `references/formats.md`, in this skill's base directory.

## Recall

- **At task start**, after reading the task and the baseline: `AGENTS.md` is already in your context. Read the overview of this benchmark, the one or two history entries most alike by fingerprint, and the lessons whose conditions match. About six lookups beyond `AGENTS.md`. Write the lessons you apply, and the effect you expect, in the run's `scratch/plan.md`.
- **During the run**, look again whenever past knowledge may help, for example before changing yourself (a plugin, strategy, preset or skill). The memory plugin only reminds you: when no new best has appeared for a quarter of the budget, that your lessons and overviews may help; after a compaction, that what you read is gone from context and your plan is in `scratch/plan.md`. You decide what to read. Facts held only in the conversation are lost at compaction; memory files are not.
- **Use is counted for you:** the memory plugin logs every memory file you read or write (with the read, write and edit tools) in the run's `memory-deliveries.jsonl`. At task end you update `uses` and `last_used` from it.

## Record

- **During a run,** update memory between chunks when you see fit (a fact you verified, a lesson that clearly failed). Everything else goes to `scratch/` until the end.
- **At task end,** the main update, with the full picture (the memory plugin reminds you when the run ends):
  1. Write the history entry: conclusions only, no solution content; short when the run brought little. `memory-deliveries.jsonl` in the run folder lists when the memory plugin reminded you, and which memory files you read and wrote.
  2. For each item you read during the run (`"use": "read"` lines in the log): add one to `uses` and set `last_used` to today.
  3. For the lessons and ideas involved: update their evidence and status.
  4. Add new lessons as hypotheses; distil new ideas from what helped, worded as options.
  5. Retire weak ideas.
  6. Record every capability enabled, built, changed or deleted, and why, in the history entry.
  7. Update only the overview and `AGENTS.md` entries this run changed, within the caps.
- **Not obligatory:** a run that teaches nothing need not change memory, and an update rewrites only what the run changed, never everything.
- **What is worth writing:** ask whether a future run will act differently because of it. If not, do not write it.
- A support worker may analyse a long run for you (see `running-a-task/references/delegate.md`); you write memory yourself.

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

## Ideas: memory for workers

- Ideas are domain hints, such as an approach that helped on a benchmark, written as options with the situation where they helped. No code, parameters, data structures or instance details.
- **An idea comes from evidence, never from a guess.** It rests on what you saw work: in one task or several, or in an analysis across runs. A hypothesis you have not seen work is not an idea; like any memory, an idea is kept or retired on what later runs show.
- **A bad example:** after reading a task's statement, writing `memory/ideas/cache-hot-nodes.md` ("a worker could cache the most visited nodes") because it seems promising. No run showed it working, so it is your guess stored as memory, and later workers would receive it as if it had evidence behind it.
- You never use them for your own decisions (directions, pacing, budget); you only pass them on to workers, as optional hints.
- The memory plugin does not deliver them: it serves only your own memory. How you organise, find and pass them on is yours to decide, for loop workers through a Var strategy you write; improving that is part of improving yourself.
- Tag each candidate whose worker received an idea with its name (row key `ideas`), so task end can count how often each idea was passed, adopted and helpful.

## Bias controls

You judge your own run, so:
- record what happened apart from why you think it happened;
- effects in `summary.md` cite candidates;
- "uncertain" is an allowed outcome.

## Memory changes

Every change to memory's own design (this skill's steps, templates, thresholds, caps, or the starting rules in `AGENTS.md`) goes under "Memory changes" in the history entry, so later runs can judge it through learning lessons.
