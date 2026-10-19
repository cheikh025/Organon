# Delegating work

Two kinds of work are kept apart:
- **Solving:** attempts at the program, judged by the evaluator. Only the loop starts these workers (Var), one per candidate.
- **Support:** everything else (an analysis, an input generator, a stress tester, a profiler, a tool), judged by you and never counted as a solution or against the budget. You start these workers yourself with `spawn_worker`.

## Solving workers: preset and attempt context

The active Var supplies the worker's first message and prepares its folder. Two things direct it:
- **The preset:** its role, persona and tools. Choose it with `evolve_use({ preset: "<preset>" })` for the next chunks, or let a Loop or Sel strategy set `a.preset` per attempt.
- **The attempt context:** what this attempt works from, supplied by the active strategies. Sel picks the parents; Var stages their files in the worker's folder and describes them in the worker's first message (`var/default` gives each parent's files, which are the task's files as changed, its feedback and its worker's report).

The two must fit: a preset's expected inputs must be what Sel and Var supply. The starting preset is `mutator`. How to design, create and change presets, with examples: `managing-capabilities/references/presets.md`.

## Support workers: `spawn_worker`

```text
spawn_worker({ preset, directory, message, description })
```

- **One-shot.** The call returns at once with the worker's id; the worker runs in the background. When it finishes, its last message arrives as a notice ("Background subagent … finished. … Its closing message: …"). It cannot receive follow-up messages: to continue, start a new worker in the same folder.
- **Confined.** It can write only in `directory`, and its file tools cannot read outside it. Put every file it needs into the folder before you start it, and give each worker its own folder inside the run, for example `scratch/workers/tester-01/`.
- **Fresh.** It does not see this conversation, your memory or `AGENTS.md`; its first message, preset and folder supply its context.
- **Preset.** The starting set has only `mutator`, which is for solving. For support work, create a support preset first (see the support example in `managing-capabilities/references/presets.md`).
- **In parallel.** Start independent workers together in one message, and continue useful work while they run.

## Ideas

Ideas are hints for workers, kept in memory (`agent/memory/ideas/`) and passed on only as options. The memory plugin does not deliver them. How you find, organise and pass them on is yours to decide. They can be included as optional hints in a worker's first message or in files supplied to it.
