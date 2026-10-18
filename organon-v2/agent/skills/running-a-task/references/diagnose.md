# Between chunks: reading the results and adjusting the search

After every `evolve_run`, read what happened before you start the next chunk. Change the search only for a reason you can state, and check afterwards whether the change did what you expected.

## What to read

- **The chunk summary** (the result of `evolve_run`): new candidates, valid and broken, the budget left, the best score before and after, one line per candidate (parents, preset, score or error, alive, first line of its report), and the alive pool with each candidate's number of children.
- **`evolve_status`:** the stall count (evaluations since the last new best), counts, and the active setup with its settings.
- **The rows** in `search/candidates.jsonl`, for lineage and patterns across chunks.
- **A candidate's folder** when you need detail: its program, its `report.md`, and `search/evals/<id>.json` (metrics and log).

## Signals

| Signal | Where | What it can mean |
|---|---|---|
| Best score moves | summary, `best` | the current setup still finds gains |
| Stall count grows | `evolve_status` | the search is circling around what it already has |
| Where gains come from | rows: `parents`, `preset`, score against the parent's | which parents, presets or strategies pay off |
| Low diversity | alive scores close together; reports describing the same change; one parent with many children | selection and variation keep doing the same thing |
| Many broken candidates | summary, `error`, the evals' `log` | a recurring failure: time limit, format, compile error |
| The same error again and again | the evals' `log` | workers do not see or understand the feedback |
| Slow chunks | summary, `seconds` | evaluations or workers dominate; concurrency may need changing |
| Budget left | summary, `budget` | how many decisions you can still make |

## Levers, from cheapest to most costly

1. **Chunk size `k`.** Smaller chunks give you more points to adjust; larger chunks waste less time between decisions.
2. **Settings,** with `evolve_use({ settings: { <slot>: { … } } })`:
   - `sel.pressure`: higher picks the best parents more often; `0` picks uniformly;
   - `surv.k`: how many candidates stay selectable; more keeps more variety;
   - `var.maxConcurrent`: workers at once; `eval.maxConcurrent`: evaluations at once.
3. **The worker preset,** with `evolve_use({ preset })`, when more than one exists.
4. **Another strategy or method** from the catalog in `evolve_status` (`available`), with `evolve_use`. For example, a Var that also shows the parent's failed children helps when they keep failing the same way.
5. **A new strategy, method or slot** when none fits: `managing-capabilities/references/strategies.md`. A new preset: `managing-capabilities/references/presets.md`.

## Situations and options

These are options to weigh, not rules:
- **Stall with low diversity:** widen selection (lower `pressure`, larger `surv.k`); have some attempts start from other parents or from nothing; use a preset that tries a different direction.
- **Stall with good diversity:** keep going a little longer before changing; gains near the top are rarer.
- **Recurring failures:** read the logs of a few broken candidates; then a Var that passes the failure more clearly, a repair preset routed after errors by a Loop strategy, or a quick check in Eval before the full evaluator.
- **One lineage dominates:** lower `pressure`, or a Surv that keeps variety, so other lines still get parents.
- **Little budget left:** favour the strategies and parents that have paid off in this run.

## Keep a record

In `scratch/decisions.md`, for each chunk: what you saw, what you changed and why, and what you expect to happen. Check the expectation after the next chunk. You may tag rows with your own keys (for example the phase they belong to); this is run-local data. The `memory` skill turns these notes into history and lessons at the end.

When the budget is used, go to `end.md`.
