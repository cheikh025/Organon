# Between chunks: reading the results and adjusting the search

After every `evolve_run`, read what happened before you start the next chunk. Change the search only for a reason you can state, and check afterwards whether the change did what you expected.

## What to read

- **The chunk summary** (the result of `evolve_run`): new candidates, valid and broken, the budget left, the best score before and after, one line per candidate (parents, preset, score or error, alive, first line of its report), and the alive pool with each candidate's number of children.
- **`evolve_status`:** the stall count (evaluations since the last new best), counts, and the strategy enabled in each slot with its settings.
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

## Ways to adjust the search

1. **Chunk size `k`.** Smaller chunks give you more points to adjust; larger chunks waste less time between decisions.
2. **Settings,** in the strategy's row `config` in `agent/evolve/cordis.patch.yml`, then reload with `plugin_manager` `set_bundle @organon/evolve enabled: true`:
   - `sel-rank` `pressure`: higher picks the best parents more often; `0` picks uniformly;
   - `surv-top-k` `k`: how many candidates stay selectable; more keeps more variety;
   - `var-default` `maxConcurrent`: workers at once; `eval-single` `maxConcurrent`: evaluations at once;
   - `var-default` `timeLimit`: minutes each worker has (default 15; `null`: no limit); with 15% of it left the worker is told to wrap up, at the limit it stops running commands and writes its closing message, and at 20% past the limit it is cancelled.

   Settings stay until you change them, across runs too. Removing a key from `config` brings back the file's default.
3. **The worker preset,** with `preset` in the Var row's `config`, when more than one exists and the active Sel and Var supply the inputs it expects.
4. **Another strategy or method** from the files in `evolve_status` (`available`): a Sel (which parents, or how many), a Var (what files and archive context the worker gets), an Eval, a Surv, or a Loop. Switch with `plugin_manager` `set_plugin`: the slot's current row off, the other one on (`managing-capabilities/references/strategies.md`).
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

After two chunks of a 30-candidate run: `k: 2` on `surv-top-k` and `pressure: 1.5` on `sel-rank`. The next chunk started every attempt from the same parent, and the search settled on one family before others had a chance. In this example, narrowing so early removed other families before their potential was explored. Narrowing can concentrate effort on productive parents, but it also reduces variety. Change it deliberately and inspect the next chunk's parent choices and results.

## Keep a record

In `scratch/decisions.md`, for each chunk: what you saw, what you changed and why, and what you expect to happen. Check the expectation after the next chunk. You may tag rows with your own keys (for example the phase they belong to); this is run-local data. The `memory` skill turns these notes into history and lessons at the end.

When the budget is used, go to `end.md`.
