---
name: running-a-task
description: Use when you are given a task to solve, and at each phase of the run that follows - setting up the run folder and the baseline, running chunks of the search, reading results between chunks, delegating support work, and closing the run.
---

# Running a task

A task run is one search for a better program for one task, under a candidate budget. You direct it; you do not solve it yourself.

**Your role.** You set up the run, start chunks with `evolve_run`, read their results, and adjust the search by switching, tuning or developing its strategies and other capabilities (`managing-capabilities`). You never pick a parent, keep a candidate, or write a solution: the active strategies make those choices, and workers write the programs.

## Phases

| Phase | What happens | Read |
|---|---|---|
| Start | create the run folder, record the baseline `c000000`, recall memory, choose the first setup | `references/start.md` |
| Chunks | `evolve_run({ k })`, then read the summary, diagnose what needs it, and decide what to change; repeat until the budget is used | `references/diagnose.md`; the `diagnosing` skill |
| Scores | what the evaluator returns, the candidate rows, the budget | `references/evaluate.md` |
| Support work | analyses, generators, testers or tools done by a worker outside the loop | `references/delegate.md` |
| End | the best candidate, `run.json`, `summary.md`, a review of how you worked, memory and capabilities | `references/end.md` |

The files above live in this skill's base directory, which the `skill` tool reported. Read the one for the phase you are in.

## Tools

| Tool | Use |
|---|---|
| `evolve_status` | budget, baseline, best candidate, the strategy and settings enabled in each slot, the strategy files and presets available, and the command that runs the evaluator by hand |
| `evolve_run` | run one chunk of up to `k` attempts and wait for its summary |
| `plugin_manager` | switch a slot's strategy (`set_plugin` on its row), and reload `@organon/evolve` after editing a strategy or its settings (`set_bundle`, `enabled: true`) |
| `spawn_worker` | start one confined worker for support work |
| `working_directory` | move into the run folder after creating it, and back to the task folder at the end |

The `evolve_*` tools belong to the loop plugin (`agent/plugins/loop/`), the strategies to the `@organon/evolve` bundle (`agent/evolve/`), and `spawn_worker` to the worker plugin (`agent/plugins/worker/`). Like every plugin, they are yours to change when they do not fit: a new parameter, another report in `evolve_status`, another way to run a chunk. Edit the code and reload it (`managing-capabilities/references/plugins.md`).

## Rules that hold for the whole run

- **The run folder is your current directory** while the run lasts; the loop tools act on it. It lives inside the task folder: `.organon/runs/<YYYY-MM-DD>_<NN>[_label]/`.
- **One run at a time.**
- **The budget counts candidates.** Every candidate the loop creates costs one unit, finished or not; the baseline costs nothing.
- **The task evaluator is fixed.** Its score of the best candidate is the run's final score. You may design and co-evolve other evaluators to guide the search; see `references/evaluate.md`.
- **Worker independence.** Workers choose their solution hypotheses and experiments. Everything you pass to them follows the [worker-independence guidance and examples](references/delegate.md#worker-independence).
- **`scratch/` in the run folder is yours:** notes, analyses, scripts, data. Write each decision you make between chunks there: each change as a line in the change ledger, `scratch/changes.jsonl`, with the effect you expect, judged after the chunk that tests it (`references/diagnose.md`).
- **Other skills:** `memory` at task start and end; `diagnosing` when something in the search goes wrong or surprises you, and in the self-review at the end; `managing-capabilities` when you consider building or removing a skill, preset, strategy or plugin.
