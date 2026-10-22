# Ending a run

The end of a run is where anything worth carrying to later tasks moves into `agent/`. Later runs start from `agent/`, not from this run folder.

## 1. Close the run

1. **The best candidate:** the valid candidate with the highest score, `c000000` included (`evolve_status` shows it as `best`).
2. **Update `run.json`:** `status` (`done`, or `stopped` when the run ended early), `best` (`{ "id", "score" }`), `budget_used`, and `ended` with the date and time.
3. **Close the ledger:** give every line in `scratch/changes.jsonl` that is still `null` its verdict (`diagnose.md`, "Measure your changes").
4. **Write `summary.md`** in the run folder, for people reading the run later:
   - the trajectory: baseline, best, and where the gains came from;
   - what worked and what did not: setups, presets, strategies, with their verdicts from `scratch/changes.jsonl` and the reasons from `scratch/decisions.md`;
   - each effect cites the candidates behind it (`c000041 → c000057`);
   - what happened, kept apart from why you think it happened; "uncertain" is an allowed answer.

The best candidate's score from the task's evaluator is the run's final score; you do not evaluate it again.

## 2. Review yourself

Before writing memory, review how your decisions and capabilities shaped the run. Use `scratch/changes.jsonl`, `scratch/decisions.md`, the rows and what you remember:
- **Mistakes:** which errors did you make, and did any repeat? A tool used wrongly, a file written in the wrong form, a step forgotten.
- **Waste:** where did turns, time or budget go without result?
- **By hand:** what did you do more than once that a skill, strategy or tool could do?
- **Decisions:** which of your expectations held, and which did not? Count the ledger's verdicts. Which kinds of change helped or hurt, and which stayed `confounded`, and why? Which diagnoses held, and for the fixes that did not help, what do their `why_not` say?
- **Capabilities:** which helped, which got in the way, and what was missing?
- **Insights:** which did you write, which did you deliver, and what do the transcripts and verdicts show about whether they were used and helped? Did a worker repeat a failure that an insight already covered (`memory/references/insights.md`)?

Each answer that would make a later run go differently becomes a fact or a self lesson in memory (step 3) or a change to a capability (step 4). Leave out answers that would change nothing.

**A bad example: misreading your own influence.** A decisions note says "all three workers independently arrived at the same design", while all three received the same inputs from you, which already pointed at that design. The convergence came from your setup, not from the workers, and the lesson drawn from it ("this design is what the task wants") is wrong. Before crediting workers or the task, check what you gave them: presets, files, the attempt context your strategies built.

## 3. Update memory

Follow the task-end steps of the `memory` skill: write the history entry (`memory-deliveries.jsonl` lists when the memory plugin reminded you during the run, and which memory files you read and wrote); append the run's closed ledger lines to the change bank, `memory/changes.jsonl`; count the use of each item you read, from that log; update the evidence and status of the lessons and insights involved; add new lessons as hypotheses; distil useful insights with source reports, evaluations, applicability and limitations; revise or retire weak insights; update only the overview and `AGENTS.md` entries this run changed. An update rewrites only what the run changed, and a run that brought little gets a short entry.

To analyse a long run before writing, you may give a support worker copies of the rows, the summaries and `scratch/` in its own folder (see `delegate.md`), and use its analysis.

When accumulated facts, lessons or insights have grown difficult to manage, follow the [memory-audit guidance](../../memory/SKILL.md#caps-and-reviews): delegate a fresh independent support audit with authority to directly consolidate, edit and delete entries within its assigned scope.

## 4. Curate capabilities

Follow `managing-capabilities`:
- **Keep** what may help later tasks, judged by how useful it was and could be, not by how general it is. What you built in `scratch/` moves into `agent/`: a procedure into a skill, a search behaviour into a strategy, a mechanical step into a plugin. What you keep never carries this task's solution; remove run paths first.
- **Delete** what proved broken or unhelpful, was replaced by something better, or is unlikely to help again. Deletion happens here, never at task start.
- **Plugins:** leave on the ones the next task is likely to use, and disable the others; the next task's start checks them again.
- **Record** every capability created, changed or deleted, and why, in the history entry.

## 5. Leave the run folder

`working_directory({ cd: "<the task folder>" })`.

## 6. Report to the user

The best candidate's id and score against the baseline, the path of its folder (`.organon/runs/<run>/search/candidates/<id>/`, the task's files as improved), and the path of `summary.md`.
