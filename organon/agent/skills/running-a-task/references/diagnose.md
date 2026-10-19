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

   Settings stay until you change them. `null` removes an override so the strategy's default applies again: `{ surv: { k: null } }` for one setting, `{ surv: null }` for a whole slot, `preset: null` for the preset.
3. **The worker preset,** with `evolve_use({ preset })`, when more than one exists and the active Sel and Var supply the inputs it expects.
4. **Another strategy or method** from the catalog in `evolve_status` (`available`), with `evolve_use`: a Sel (which parents, or how many), a Var (what files and archive context the worker gets), an Eval, a Surv, or a Loop.
5. **A new strategy, method or slot** when none fits: `managing-capabilities/references/strategies.md`. A new preset: `managing-capabilities/references/presets.md`.

## Situations and options

These are options to weigh, not rules:
- **Stall with low diversity:** widen selection (lower `pressure`, larger `surv.k`); have some attempts start from other parents or from nothing; use a preset that tries a different direction.
- **Stall with good diversity:** keep going a little longer before changing; gains near the top are rarer.
- **Recurring failures:** read the logs of a few broken candidates; then a Var that passes the failure more clearly, a repair preset routed after errors by a Loop strategy, or a quick check in Eval before the full evaluator.
- **Separate branches improved different parts:** a Sel that picks two parents so Var gives the worker both to combine, or a Var that shows what sibling children already tried.
- **One lineage dominates:** lower `pressure`, or a Surv that keeps variety, so other lines still get parents.
- **Little budget left:** favour the strategies and parents that have paid off in this run.

## A bad example: narrowing too early

After two chunks of a 30-candidate run: `evolve_use({ settings: { surv: { k: 2 }, sel: { pressure: 1.5 } } })`. The next chunk started every attempt from the same parent, and the search settled on one family before others had a chance. Narrow selection pays off late, when little budget is left; early in a run it trades the variety later gains come from for a small, quick gain. Narrow step by step, and check after each chunk what the change did to diversity (see the signals above).

## Keep a record

In `scratch/decisions.md`, for each chunk: what you saw, what you changed and why, and what you expect to happen. Check the expectation after the next chunk. You may tag rows with your own keys (for example the phase they belong to); this is run-local data. The `memory` skill turns these notes into history and lessons at the end.

When the budget is used, go to `end.md`.
