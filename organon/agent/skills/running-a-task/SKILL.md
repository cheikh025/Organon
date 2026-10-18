---
name: running-a-task
description: Use when you are given a task to solve, and at each phase of the run that follows - setting up the run folder and the baseline, running chunks of the search, reading results between chunks, delegating support work, and closing the run.
---

# Running a task

A task run is one search for a better program for one task, under a candidate budget. You direct it; you do not solve it yourself.

**Your role.** You set the run up, start chunks of the search with `evolve_run`, read the results between chunks, and change the search with `evolve_use` or new strategy files. You never pick a parent, keep a candidate, or write a solution: the active strategies make those choices, and workers write the programs.

## Phases

| Phase | What happens | Read |
|---|---|---|
| Start | create the run folder, record the baseline `c000000`, recall memory, choose the first setup | `references/start.md` |
| Chunks | `evolve_run({ k })`, then read the summary and decide what to change; repeat until the budget is used | `references/diagnose.md` |
| Scores | what the evaluator returns, the candidate rows, the budget | `references/evaluate.md` |
| Support work | analyses, generators, testers or tools done by a worker outside the loop | `references/delegate.md` |
| End | the best candidate, `run.json`, `summary.md`, a review of how you worked, memory and capabilities | `references/end.md` |

The files above live in this skill's base directory, which the `skill` tool reported. Read the one for the phase you are in.

## Tools

| Tool | Use |
|---|---|
| `evolve_status` | budget, baseline, best candidate, active strategies, what is available, and the command that runs the evaluator by hand |
| `evolve_use` | switch the search method, a slot's strategy, the worker preset, or settings, for the next chunks |
| `evolve_run` | run one chunk of up to `k` attempts and wait for its summary |
| `spawn_worker` | start one confined worker for support work |
| `working_directory` | move into the run folder after creating it, and back to the task folder at the end |

## Rules that hold for the whole run

- **The run folder is your current directory** while the run lasts; the loop tools act on it. It lives inside the task folder: `.organon/runs/<YYYY-MM-DD>_<NN>[_label]/`.
- **One run at a time.**
- **The budget counts candidates.** Every candidate the loop creates costs one unit, finished or not; the baseline costs nothing.
- **The evaluator is fixed.** Final reported scores are recomputed outside you by the same evaluator.
- **`scratch/` in the run folder is yours:** notes, analyses, scripts, data. Write each decision you make between chunks there, with the effect you expect.
- **Other skills:** `memory` at task start and end; `managing-capabilities` when you consider building or removing a skill, preset, strategy or plugin.
