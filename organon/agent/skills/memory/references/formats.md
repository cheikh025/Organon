# Memory formats

One item per file, a YAML header, then a short body. A lesson's free-text `condition` says when it applies; matching it to the situation is your judgment.

## Fact: `memory/facts/<slug>.md`

```markdown
---
name: reload-linked-bundle
category: environment          # environment | evaluator | operator | location
scope: global                  # global | <benchmark>
verified: <date>, DSH <version>
created: <date>
last_used: <date>
uses: 0
---
After editing an installed bundle's code, one no-op `set_bundle <package> enabled: true` reloads it in about half a second; installing it again is refused (`already-installed`).
Why: reinstalling cost two pnpm runs and a refusal before the reload was found.
How to apply: after every edit to a plugin in agent/plugins/, reload it this way instead of reinstalling.
```

## Lesson: `memory/lessons/<slug>.md`

```markdown
---
name: explore-on-stall
level: process                 # process | self | learning
scope: global                  # global | <benchmark>
condition: no gain for about a quarter of the budget and low diversity
claim: giving part of the next chunk to an explore preset beats more refining of the best candidate
polarity: positive             # positive | negative
pattern: low diversity at a stall   # lessons about a kind of change: the bank's pattern and owner keys
owner: preset
status: hypothesis             # hypothesis | supported | doubtful | refuted | compiled
evidence_for: [history/<run entry>]  # lessons about changes cite bank lines: changes.jsonl <run> <id>
evidence_against: []
recheck: none                  # for negative lessons: when to test again
created: <date>
last_used: <date>
uses: 0
---
Why: <what was observed, citing history entries>.
How to apply: when the condition holds, <what to do in terms of presets, strategies, settings or pacing>.
```

## Insight: `memory/insights/<slug>.md`

Insights preserve approach-level findings from worker experiments on the current task or other tasks. Keep enough technical detail to explain what was learned, with source-task identities, worker reports, evaluations and limitations. Source paths and candidate references belong here; operational history entries need not contain solution details. Share only traceable findings, retaining uncertainty and relevant failures or tradeoffs. Summaries must not add untested solution proposals or assign the next implementation. The memory plugin does not deliver insights. A starting format:

```markdown
---
name: <slug>
scope: <benchmark>
finding: <what worker experiments established about the approach>
situation: <problem structure and conditions under which it was evaluated>
sources:
  - task: <benchmark/task identity; not just a run name>
    run: <path to source run>
    reports: [<worker report paths>]
    evaluations: [<evaluation paths for the comparison>]
limitations: <uncertainty, tradeoffs and untested conditions>
related: []                    # insights that refine, extend or contradict this one
transfer: {passed: 0, adopted: 0, helped: 0}   # counted from evidence: references/insights.md
created: <date>
last_used: <date>
uses: 0
---
Mechanism: <how the approach worked, including relevant technical detail>.
Observed result: <measured comparison and its conditions>.
Possible relevance: <conditions that could justify investigation on this task or another; not an instruction>.
```

Illustrative findings, not claims about actual runs or preferred techniques:

- A worker's duplicate-elimination experiment reduced repeated exploration, but checking equivalence added overhead. The record preserves the equivalence criterion and measured comparison.
- A worker found that batching operations improved throughput on large inputs but increased latency on small ones. The record preserves the evaluated batch sizes and input conditions.
- A worker's sparse representation reduced memory use on the evaluated inputs, while dense cases ran more slowly. The record preserves the representation choices and the observed tradeoff.

Each finding requires its actual source reports and evaluations. It may inform later workers on the same task or workers on other tasks. Preserve the measured outcome and conditions; workers choose its applicability and their experiments. "A worker observed this tradeoff; the comparison is supplied" shares evidence. "Implement this pruning rule next, optionally" assigns a solution. The main agent's untested proposal cannot become an insight by being stored beside a real finding.

## Change bank: `memory/changes.jsonl`

One JSON object per line: a closed line of a run's ledger (`scratch/changes.jsonl`, every field it has, the diagnosis fields included), with three keys added in front. Append at task end; never rewrite or delete a line.

```json
{"run":"tasks/kernel_builder/.organon/runs/2026-10-25_01","benchmark":"kernel_builder","fingerprint":{"eval_time":"40s","noise":"none"},"id":"ch05","pattern":"attempts end without testing","owner":"var + preset","component":"var","change":"stage quick_check.py","test":"matched","verdict":"helped","why_not":null,"evidence":["c000044","c000047"]}
```

| Key | Holds |
|---|---|
| `run` | the run folder, relative to the repository, where the full record is |
| `benchmark` | the benchmark the task belongs to, as in the history entry's file name |
| `fingerprint` | the run's fingerprint, copied from its history entry |
| the rest | the ledger line as the run left it |

A line is found by its `run` and `id`. Search it by `pattern`, `owner`, `component` or `change` text.

## History entry: `memory/history/<date>_<benchmark>_<task>_<NN>.md`

At most about 40 lines; conclusions only.

```markdown
---
run: <task folder>/.organon/runs/<run-name>  # where the full record is
fingerprint: {objective: max, time_limit: 2s, eval_time: 40s, noise: low, language: C++, budget: 100}
environment: {dsh: <version>, model: <model>}
outcome: {baseline: <score>, best: <score>, budget_used: <used>/<limit>}
---
## Directions used            (preset → helped / no effect / hurt)
## Process                    (pacing, stalls and responses, which presets and attempt context workers got)
## Capabilities               (enabled / built / changed / deleted, and why)
## Changes                    (ledger verdicts: helped / hurt / no effect / confounded counts; each change that helped or hurt, with its test; the lines themselves are in the change bank)
## Lessons used               (lesson → applied? → did the outcome agree?)
## Insights passed            (insight slug → adopted? → helped?; no solution mechanisms)
## Predictions vs outcomes    (one or two lines)
## Surprises                  (environment, evaluator)
## Memory changes             (added, updated, status changes, memory-skill edits)
```

The fingerprint holds measurement properties only, never the problem class, so later tasks find past runs that behaved alike as searches, not tasks that need the same kind of solution.

## Overview: `memory/overviews/<scope>.md`

At most about 80 lines: how the search and the environment behave in this scope (evaluator profile, what pacing and directions tend to do), pointing to the lessons and facts rather than copying them. Each piece of knowledge keeps one home.

## `agent/AGENTS.md`

At most about 200 lines, in this order:
1. the starting rules;
2. how memory is organised, with a pointer to this skill;
3. facts, one line each;
4. plugins: what each fits, and its evidence;
5. the strongest supported general lessons;
6. the list of overviews;
7. a pointer to `memory/insights/`, with a count per benchmark, without approach descriptions.

Skills are not listed: DSH lists them.
