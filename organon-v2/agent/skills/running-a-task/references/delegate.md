# Delegating work

Two kinds of work are kept apart:
- **Solving:** attempts at the program, judged by the evaluator. Only the loop starts these workers (Var), one per candidate.
- **Support:** everything else (an analysis, an input generator, a stress tester, a profiler, a tool), judged by you and never counted as a solution or against the budget. You start these workers yourself with `spawn_worker`.

## Solving workers: Var and preset, never a hand-written brief

You never brief a single attempt by hand:
- **What a worker gets** (the files in its folder and the brief) comes from the active **Var** strategy (`var/default` gives each parent's files, which are the task's files as changed, its feedback and its worker's report; another Var can add sibling attempts, a local checker, or an optional idea).
- **How the worker works** comes from the **preset**: `evolve_use({ preset: "<preset>" })` for the next chunks, or a Loop strategy that sets `a.preset` per attempt before `core.variate(a)` (see `managing-capabilities/references/strategies.md`).

A preset holds only a way of working, never task content or an approach to the solution. The starting preset is `mutator`: improve the program in the folder using the feedback and the report. Others (`explore`, `refine`, `repair`, …) are created when a kind of work keeps coming back that `mutator` does not cover; see `managing-capabilities/references/presets.md`.

## Support workers: `spawn_worker`

```text
spawn_worker({ preset, directory, brief, description })
```

- **One-shot.** The call returns at once with the worker's id; the worker runs in the background. When it finishes, its last message arrives as a notice ("Background subagent … finished. … Its closing message: …"). It cannot receive follow-up messages: to continue, start a new worker in the same folder.
- **Confined.** It can write only in `directory`, and its file tools cannot read outside it. Put every file it needs into the folder before you start it, and give each worker its own folder inside the run, for example `scratch/workers/tester-01/`.
- **Fresh.** It does not see this conversation, your memory or `AGENTS.md`; the brief and the folder are all it knows.
- **Preset.** The starting set has only `mutator`, which is for solving. For support work, create a support preset first (a way of working such as "do the support work the brief asks for and report what you found").
- **In parallel.** Start independent workers together in one message, and continue useful work while they run.

## The brief

Write it in the same seven parts every time; restate the rules, because the worker knows nothing else.

1. **Task or goal:** what this piece of work is.
2. **Start from:** the files in its folder.
3. **Focus:** what to concentrate on.
4. **What we know:** results and constraints that matter.
5. **Optional ideas:** hints it may ignore, worded as options.
6. **Rules:** work only in this folder; anything else that applies.
7. **Deliver:** the files, and what the final message must say, in a few lines.

Example:

```text
Goal: find inputs where ./solution.cpp is wrong or too slow.
Start from: ./solution.cpp and ./statement.md.
Focus: inputs near the size limits.
What we know: the evaluator's time limit is 2 s per case; large cases are close to it (see ./feedback.txt).
Rules: work only in this folder; keep every generated input.
Deliver: the generator, a brute-force checker for small cases, the failing inputs in ./failures/, and a final message of at most 10 lines: how many cases you ran, what failed, and your best guess at the cause.
```

## Ideas

Ideas are hints for workers, kept in memory (`agent/memory/ideas/`) and passed on only as options. The memory plugin does not deliver them. How you find, organise and pass them on is yours to decide: to loop workers, through a Var strategy you write (see `managing-capabilities/references/strategies.md`); in a support brief, part 5 can carry one.
