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
status: hypothesis             # hypothesis | supported | doubtful | refuted | compiled
evidence_for: [history/<run entry>]
evidence_against: []
recheck: none                  # for negative lessons: when to test again
created: <date>
last_used: <date>
uses: 0
---
Why: <what was observed, citing history entries>.
How to apply: when the condition holds, <what to do in terms of presets, strategies, settings or pacing>.
```

## Idea: `memory/ideas/<slug>.md`

Ideas are optional hints for workers, separate from the memory that guides your own search decisions. The memory plugin does not deliver them; how you organise, find and pass them on is yours to decide. Each one rests on evidence from runs, not on a guess. A starting format:

```markdown
---
name: annealed-acceptance
scope: <benchmark>
idea: a worker could try local search that sometimes accepts worse moves, less often over time, to get past early plateaus
situation: plain local search stalls early and candidates become near-identical
evidence: {passed: 0, adopted: 0, helped: 0}
created: <date>
last_used: <date>
---
```

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
## Lessons used               (lesson → applied? → did the outcome agree?)
## Ideas passed               (idea → adopted? → helped?)
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
7. a pointer to `memory/ideas/`, with a count per benchmark.

Skills are not listed: DSH lists them.
