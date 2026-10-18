# Ending a run

The end of a run is where anything worth carrying to later tasks moves into `agent/`. Later runs start from `agent/`, not from this run folder.

## 1. Close the run

1. **The best candidate:** the valid candidate with the highest score, `c000000` included (`evolve_status` shows it as `best`).
2. **Update `run.json`:** `status` (`done`, or `stopped` when the run ended early), `best` (`{ "id", "score" }`), `budget_used`, and `ended` with the date and time.
3. **Write `summary.md`** in the run folder, for people reading the run later:
   - the trajectory: baseline, best, and where the gains came from;
   - what worked and what did not: setups, presets, strategies, decisions from `scratch/decisions.md`;
   - each effect cites the candidates behind it (`c000041 → c000057`);
   - what happened, kept apart from why you think it happened; "uncertain" is an allowed answer.

The final reported score is recomputed outside you by the fixed evaluator, so you do not evaluate again.

## 2. Review yourself

Before writing memory, look at how you worked, not at the search. Use `scratch/decisions.md`, the rows and what you remember of the run:
- **Mistakes:** which errors did you make, and did any repeat? A tool used wrongly, a file written in the wrong form, a step forgotten.
- **Waste:** where did turns, time or budget go without result?
- **By hand:** what did you do more than once that a skill, strategy or tool could do?
- **Decisions:** which of your expectations held, and which did not?
- **Capabilities:** which helped, which got in the way, and what was missing?

Each answer that would make a later run go differently becomes a fact or a self lesson in memory (step 3) or a change to a capability (step 4). Leave out answers that would change nothing.

## 3. Update memory

Follow the task-end steps of the `memory` skill: write the history entry (`memory-deliveries.jsonl` lists when the memory plugin reminded you during the run); update the evidence, status and use of the lessons and ideas involved; add new lessons as hypotheses; retire weak ideas; update only the overview and `AGENTS.md` entries this run changed. An update rewrites only what the run changed, and a run that brought little gets a short entry.

To analyse a long run before writing, you may give a support worker copies of the rows, the summaries and `scratch/` in its own folder (see `delegate.md`), and use its analysis.

## 4. Curate capabilities

Follow `managing-capabilities`:
- **Promote** what proved useful and general from `scratch/`: a procedure into a skill, a search behaviour into a strategy, a mechanical step into a plugin. Remove run paths and task-specific constants first.
- **Delete** what was a one-off for this task, proved broken or unhelpful, or was replaced by something better. Deletion happens here, never at task start.
- **Plugins:** disable the ones that only fit this kind of task, or leave general ones on; the next task's start checks them again.
- **Record** every capability created, changed or deleted, and why, in the history entry.

## 5. Leave the run folder

`working_directory({ cd: "<the workspace>" })`.

## 6. Report to the user

The best candidate's id and score against the baseline, the path of its program (`runs/…/search/candidates/<id>/<program>`), and the path of `summary.md`.
