# Evidence in a run

Every claim in a diagnosis rests on one of these sources. Say which one, and weigh it by what it can show.

| Source | Where | Shows | Trust |
|---|---|---|---|
| Rows | `search/candidates.jsonl` | parents, preset, strategy of each slot, score or error, alive; your own tags | exact, for what they record |
| Evaluations | `search/evals/<id>.json` | the evaluator's full result (`metrics`) and the end of its output (`log`) | ground truth for the outcome |
| Chunk summaries | the result of `evolve_run` | counts, best before and after, one line per candidate | a digest: a place to start |
| Reports | `search/candidates/<id>/report.md` | the worker's own account of what it did | the worker's claim; it can be wrong ("tested" when it was not) |
| Candidate folders | `search/candidates/<id>/` | the program as evaluated, and the files the worker made | exact |
| Worker transcripts | DSH's session store (below) | every step the worker took: what it read, ran, wrote and said, with times | exact, for behaviour; the source the others are checked against |
| Your record | `scratch/changes.jsonl`, `scratch/decisions.md` | what you changed, when, and why | your own claims, checked by their verdicts |
| Memory use | `memory-deliveries.jsonl` | which memory files you read and wrote, and when | exact |

## Worker transcripts

A row's `worker` is the worker's session id. DSH keeps the session in `<DSH_HOME>/sessions/<folder slug>/<session id>/session.v4.jsonl.zstd` (`DSH_HOME` defaults to `~/.dsh`): one JSON record per line, compressed. Read it with the script in this skill's `scripts/` folder:

```text
node <skill base>/scripts/transcript.mjs <session id>            timeline: what it was given, said, called, got back
node <skill base>/scripts/transcript.mjs <session id> --summary  duration, time per tool, longest calls, closing message
node <skill base>/scripts/transcript.mjs <session id> --full     whole texts instead of first lines
```

The summary separates time in tool calls from the rest, which is time spent in model turns. A worker that ran out of time shows where its minutes went; a worker that "tested" shows whether it ran anything.

## Looking across candidates

Diagnosis works on patterns, so tabulate. Write small scripts in `scratch/` that group the rows and evaluations the way the question needs: outcomes per parent, per preset, per strategy; failures by the first line of their error; durations from the transcripts' summaries. Keep a script that proves useful as a capability (`managing-capabilities`).
