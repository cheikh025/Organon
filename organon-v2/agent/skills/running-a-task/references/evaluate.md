# Scores, rows and budget

## The evaluator

Each task has one fixed evaluator: `<task folder>/evaluator/evaluator.py`, with `evaluate(program_path)` returning a dict. Treat it as a measuring instrument: learn how it behaves (time per evaluation, noise, feedback, failure modes), never change it. Final reported scores are recomputed outside you by the same evaluator.

`task.json` gives its settings: `program` (the file it scores), `timeout` (seconds per attempt), `max_retries` (how often an exception is retried), `sandbox` (run it confined), and `env` (environment values).

The loop runs it through a runner script. The runner turns the evaluator's dict into one result:
- **failed** when the dict has a non-empty `error`, or when no result came back: a timeout, an exception on every attempt, a result that is not a dict, or a score that is not a finite number;
- otherwise **scored**: `combined_score`, or the mean of the numeric metrics when it is missing. A higher score is better.

## What one evaluation leaves

`search/evals/<id>.json`, written for every candidate the loop scores (and by you for `c000000`):

| Key | Holds |
|---|---|
| `score` | the score, or `null` when it failed |
| `error` | why it failed, or `null` |
| `metrics` | the evaluator's full dict: per-case results, messages, timings, whatever the evaluator reports |
| `log` | the end of what the evaluator printed; useful for tracebacks |

The next worker that starts from a candidate gets this as `parent_feedback.txt`.

## The candidate rows

`search/candidates.jsonl` has one JSON object per candidate. Rows are schema-free: any strategy may add any key, and so may you between chunks (tags, analyses, a score from your own check). The keys the starting strategies share:

| Key | Written by | Meaning |
|---|---|---|
| `id` | the loop | `c000000`, `c000001`, … |
| `parents` | Sel | the candidates this one started from |
| `folder` | the loop | `search/candidates/<id>`: the program, the files the worker created, `report.md` |
| `loop`, `sel`, `var`, `eval`, `surv`, `method` | the loop | the strategy each slot used, and the method when one was named |
| `preset` | Var | the worker preset that built it |
| `worker` | Var | the worker's session id, where its full transcript is |
| `report` | Var | the worker's last message: what it changed, why, what it expects |
| `score` or `error` | Eval | the result |
| `alive` | Surv | whether Sel may pick it as a parent |

A row with neither `score` nor `error` is a candidate whose chunk stopped before it was scored.

## The budget

`search/budget.json` holds the limit. Every row other than `c000000` costs one unit: finished, failed or interrupted, because its worker spent the effort. `evolve_run` never runs more attempts than the budget has left, and `evolve_status` shows `{ limit, used, remaining }`. A row you add by hand counts too.
