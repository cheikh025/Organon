# Delegating work

Two kinds of work are kept apart:
- **Solving:** attempts at the program, judged by the evaluator. Only the loop starts these workers (Var), one per candidate.
- **Support:** everything else (an analysis, an input generator, a stress tester, a profiler, a tool), judged by you and never counted as a solution or against the budget. You start these workers yourself with `spawn_worker`.

## Worker independence

**This applies to everything you pass to any worker:** messages, briefs, notes, presets, files, memory hints, selected or summarized reports, and context produced by strategies or plugins. The content matters, whatever its name or delivery channel.

Communicate the objective, task requirements, constraints, available artifacts, measurements and prior observations with their limitations. Workers independently choose their solution hypotheses and experiments. Do not assign a particular task-solution idea, algorithm, component change or implementation plan. General working methods belong in presets; invocation context supplies the assignment and evidence.

Saying "you are free to explore" or labeling a direction "optional" does not restore independence when the surrounding content already tells the worker what solution to build. Parent programs and prior reports are evidence to investigate, not instructions to reproduce their mechanisms.

| Allowed | Not allowed |
|---|---|
| Improve performance while preserving the required behavior; choose your experiments | Replace the candidate's decision rule with the ranking formula in my notes |
| The supplied profile records where time was spent; investigate opportunities you find promising | Implement a cache for the operations highlighted in the profile |
| Compare the supplied parents and decide whether useful relationships exist | Take this component from one parent and that component from the other |
| These failures occurred under the recorded conditions; investigate their causes | Fix the failures by adding a retry queue |
| Reduce resource consumption within the task requirements | Replace the representation with packed arrays |
| This earlier attempt reported no improvement; its measurements and limitations are included | That approach is dead; implement this alternative instead |

Before passing material on, ask whether it helps the worker understand the assignment or chooses its next solution hypothesis for it. Apply the same boundary when forwarding support-worker findings.

Detailed knowledge of an approach discovered in worker experiments on the current task or another task may be supplied as an [insight](#insights), with its source evidence and limitations. Naming or explaining the observed approach is allowed; assigning it as the current worker's solution is not. Workers judge its relevance and choose their experiments.

## Solving workers: preset and attempt context

The active Var supplies the worker's first message and prepares its folder. Two things direct it:
- **The preset:** its role, persona and tools. Choose it with `preset` in the Var row's `config` (then reload `@organon/evolve`) for the next chunks, or let a Loop or Sel strategy set `a.preset` per attempt.
- **The attempt context:** what this attempt works from, supplied by the active strategies. Sel picks the parents; Var stages their files in the worker's folder and describes them in the worker's first message (`var/default` gives each parent's files, which are the task's files as changed, its feedback and its worker's report).

Match the preset to the attempt context: the files and information Sel and Var supply must satisfy the preset's input expectations. The starting preset is `mutator`. How to design, create and change presets, with examples: `managing-capabilities/references/presets.md`.

## Support workers: `spawn_worker`

```text
spawn_worker({ preset, directory, message, description, timeLimit })
```

- **Time limit.** `timeLimit` gives the worker that many minutes: it sees its time, is told to wrap up near the limit, and at the limit stops running commands and writes its closing message. Omit it for no limit.
- **One-shot.** The call returns at once with the worker's id; the worker runs in the background. When it finishes, its last message arrives as a notice ("Background subagent … finished. … Its closing message: …"). It cannot receive follow-up messages: to continue, start a new worker in the same folder.
- **Confined.** It can write only in `directory`, and its file tools cannot read outside it. Put every file it needs into the folder before you start it, and give each worker its own folder inside the run, for example `scratch/workers/tester-01/`.
- **Fresh.** It does not see this conversation, your memory or `AGENTS.md`; its first message, preset and folder supply its context.
- **Preset.** The starting set has only `mutator`, which is for solving. For support work, create a support preset first (see the support example in `managing-capabilities/references/presets.md`).
- **In parallel.** Start independent workers together in one message, and continue useful work while they run.

## Insights

Insights in `agent/memory/insights/` preserve approach-level findings from worker experiments on the current task or other tasks. They may explain algorithms and mechanisms in useful technical detail. Before sharing one, verify its source reports and evaluations, preserve conditions and limitations, and keep any interpretation distinct from observations. Do not add untested mechanisms or plans, or make the finding a required next experiment. Workers decide applicability, adaptation and experiments. A main-agent proposal cannot become prior knowledge by being stored as an insight or labeled optional. See the [memory skill](../../memory/SKILL.md#insights-memory-for-workers) for recording and delivery rules. The memory plugin does not deliver insights.
