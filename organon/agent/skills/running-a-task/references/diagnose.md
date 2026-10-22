# Between chunks: reading the results and adjusting the search

After every `evolve_run`, read what happened before you start the next chunk. Change the search only for a reason you can state, and check afterwards whether the change did what you expected: every change goes into the change ledger before the chunk that tests it (see "Measure your changes").

## What to read

- **The chunk summary** (the result of `evolve_run`): new candidates, valid and broken, the budget left, the best score before and after, one line per candidate (parents, preset, score or error, alive, first line of its report), and the alive pool with each candidate's number of children.
- **`evolve_status`:** the stall count (evaluations since the last new best), counts, and the strategy enabled in each slot with its settings.
- **The rows** in `search/candidates.jsonl`, for lineage and patterns across chunks.
- **A candidate's folder** when you need detail: its program, its `report.md`, and `search/evals/<id>.json` (metrics and log); and its worker's transcript, for what the worker actually did (`diagnosing/references/evidence.md`).

## Signals: the quick scan

After each chunk, scan these to notice what needs a closer look. When something surprises you, the search stalls, failures jump or one pattern repeats, diagnose it with the `diagnosing` skill before you change anything.

| Signal | Where | What it can mean |
|---|---|---|
| Best score moves by more than the gain floor | summary, `best`, `gainFloor` in `run.json` | the current setup still finds gains; a smaller move is a tie |
| Stall count grows | `evolve_status` | the search is circling around what it already has; the count restarts at any higher score, so check whether that score cleared the floor |
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

## Patterns seen before

Known situations, with what to check, their usual causes, the owners to consider and the fixes tried, are in the `diagnosing` skill's `references/patterns.md`. They start a diagnosis; they do not replace it.

## A bad example: narrowing too early

After two chunks of a 30-candidate run: `k: 2` on `surv-top-k` and `pressure: 1.5` on `sel-rank`. The next chunk started every attempt from the same parent, and the search settled on one family before others had a chance. In this example, narrowing so early removed other families before their potential was explored. Narrowing can concentrate effort on productive parents, but it also reduces variety. Change it deliberately and inspect the next chunk's parent choices and results.

## Measure your changes

A change is a claim about the search: you expect it to cause an effect. Record the claim before the chunk that tests it, and judge it afterwards, so that you and later runs learn which changes work.

**The change ledger.** `scratch/changes.jsonl` holds one JSON line per change: a setting, a strategy, a preset, a plugin, a skill, or the chunk size. Write the line before the chunk that tests the change, with `verdict` set to `null`:

```json
{"id":"ch04","chunk":4,"component":"preset","change":"half of the attempts use explore instead of mutator","why":"no new best for 9 evaluations; alive scores within the gain floor of each other","expect":"at least one explore child beats the best by more than the gain floor","test":"sequential","verdict":null}
```

After the chunk, rewrite that line with the verdict and the candidates behind it:

```json
{"id":"ch04","chunk":4,"component":"preset","change":"half of the attempts use explore instead of mutator","why":"no new best for 9 evaluations; alive scores within the gain floor of each other","expect":"at least one explore child beats the best by more than the gain floor","test":"sequential","verdict":"helped","evidence":["c000041 (explore) 1271 against the best 1250, floor 12"]}
```

| Verdict | When |
|---|---|
| `helped` | the expectation held, by more than the gain floor |
| `hurt` | results got worse by more than the gain floor |
| `no effect` | the test was clean, and nothing moved beyond the floor |
| `confounded` | the test cannot tell: another change overlapped, or one data point is all you have |

When a diagnosis led to the change, the line also carries the diagnosis: its trigger, the pattern and its evidence, a contrast, the cause and how you checked it, the owner of the fix, and what could break (the `diagnosing` skill defines these fields):

```json
{"id":"ch05","chunk":6,"trigger":"ch04 expected explore children within the floor; none scored","pattern":"7 of 10 attempts ended without testing their final version","evidence":["c000044 report: 'ran out of time before testing'","c000047 transcript: the full evaluator after each edit, about 4 min each"],"contrast":"c000049 and c000051, same parent, tested on a few inputs first, finished and scored","cause":"workers run the full evaluator after every edit and use up their time","cause_check":"6 of 7 timed-out transcripts spent over 60% of their time in evaluator calls; the 3 that finished did not","owner":"Var (stage a quick-check script) and the preset (test on a few inputs first)","at_risk":"the quick check disagrees with the full evaluator and workers tune to it","component":"var","change":"var stages scripts/quick_check.py; one line about it in the mutator persona","expect":"fewer than 3 of 10 attempts end untested; the valid share rises","test":"matched","verdict":null}
```

`confounded` is the default when in doubt. It is a valid answer, not a failure. A verdict other than `helped` also gets `why_not` (`cause wrong`, `fix wrong`, `not applied`, `too little evidence`; see the `diagnosing` skill), so a right diagnosis is not dropped with a wrong fix. A verdict may need more than one chunk: leave it `null` until you can judge, and judge every open line by the end of the run. `test` says how you compared: `historical`, `matched` (both below) or `sequential` (against earlier chunks).

**Look in the rows first.** Before you spend budget on a test, check whether the rows already hold one. A parent that has children from both choices you want to compare is a matched pair the search made for free. A choice here is anything the rows record per candidate: `preset`, `var`, `sel`, or an `arm` tag. Group the rows by parent, keep the parents with children on both sides, and compare per parent against the gain floor:

| Parent | `mutator` children | `explore` children | Difference |
|---|---|---|---|
| c000012 | c000015: 1240, c000019: 1244 | c000031: 1262 | +18 |
| c000020 | c000024: 1251 | c000033: 1249 | −2 |
| c000027 | c000029: 1239 | c000038: 1258 | +19 |

With a floor of 12, this reads `helped`, with `"test": "historical"` and the pairs as evidence. Rows from past runs on the same benchmark count too, when the choice meant the same thing there. A historical pair is fair only when:
- **nothing else changed between the two children:** check the ledger for changes that fell between them; the rows stamp strategy names, not settings such as `timeLimit`, so the ledger is the check. A pair with another change between its children is `confounded`;
- **the parent did not get one choice for a reason that also affects the outcome:** if `explore` was used only once a parent had stalled, its children started from a harder position;
- **the sides are compared fairly:** with unequal numbers of children, compare means, or one child per side, not the best of many against the best of one;
- **failures stay in:** a failed child is an outcome; dropping it favours the choice that fails more often.

When the rows hold too few fair pairs, run a matched comparison for the rest.

**One change at a time, later in the run.** Early on you may change several related things together. In the second half of the budget, make one change per chunk, so each verdict has one cause. When you change several things at once anyway, give each its own line and expect `confounded`.

**Matched comparison.** A change that acts per attempt, such as a preset or the context Var gives a worker, can be tested within one chunk. Run attempts with and without the change from the same parents, so the parents' quality cancels out. A Loop that runs each Sel pick once per arm does this (the *paired* example in `managing-capabilities/references/strategies.md`). Both children are ordinary candidates and count against the budget as usual; the cost is that the chunk works from fewer parents. Judge by the per-parent differences against the gain floor:

| Parent | `mutator` child | `explore` child | Difference |
|---|---|---|---|
| c000031 | 1248 | 1271 | +23 |
| c000027 | 1239 | 1236 | −3 |
| c000035 | 1251 | 1266 | +15 |

With a floor of 12, this reads `helped`: two clear wins and one tie. Differences of +20, −18 and +2 would read `no effect`. A change that acts on the whole population, such as Sel, Surv or `k`, cannot be paired. Compare it with earlier chunks, and expect `confounded` unless the effect clearly exceeds the floor.

## Keep a record

In `scratch/decisions.md`, for each chunk: what you saw, why you made the changes you made, and the diagnoses that led to no change. The changes themselves, with their diagnoses, what you expect from them and their verdicts, go in the ledger. You may tag rows with your own keys (for example the phase they belong to, or `arm` in a matched comparison); this is run-local data. The `memory` skill turns these notes and the ledger into history and lessons at the end.

When the budget is used, go to `end.md`.
