# Choosing the kind

First ask whether an existing capability meets the need or can be configured to do so. An ordinary operation need not become a new capability. Worker roles and working methods belong in presets; Var supplies factual attempt context. When new behavior is needed, choose the kind that owns that decision.

| What you have | Kind | Because |
|---|---|---|
| Knowledge: a fact about the environment, a lesson about directing the search, a hint for workers | **memory** | it is read when it applies; see the `memory` skill |
| A procedure you follow by reading it | **skill** | flexible and cheap, but it works only when you load and follow it |
| A role for a worker: its purpose, method, constraints and tools | **preset** | it shapes every worker that uses it, with the attempt context Sel and Var supply |
| A way of searching: how parents are picked, candidates built, scored or kept, or when the slots run | **strategy**, a plugin in `agent/evolve/` | it runs inside the loop on every attempt, and combines with the other slots |
| Something that must happen by itself: every time, mechanically, heavy to compute, or hooked into the harness | **plugin** | it acts without being remembered |

**Rule of thumb:** a skill records a procedure; a strategy executes a search decision; a plugin supplies a tool, service or event reaction in the harness. Extend an existing capability when it already owns the operation. These forms can work together; they are not steps you must go through in order.

**General or specific:** capabilities may be general or task-specific, using the task's facts and measurements while leaving solution hypotheses and experiments to workers. Moving instructions into a preset, plugin or context file does not change that boundary. What you keep after the task never carries this task's solution: the algorithms, parameters and code of its candidates stay in the run folder. Evidence-backed hints follow the `memory` skill and remain options, not assigned experiments.

For possibilities, see the compact lists of [search strategies and population methods](strategies.md#possible-strategies) and [worker roles and working methods](presets.md#possible-working-methods). They are starting points to adapt or extend, not a fixed catalog.

For anything passed to a worker, follow the [worker-independence guidance and examples](../../running-a-task/references/delegate.md#worker-independence), whichever capability delivers it.

Examples:

- "IO time counts toward the time limit" → a fact in memory.
- "An observed relationship between population diversity and search progress" → a lesson in memory, with its conditions and evidence.
- "How to reload a linked bundle after editing it" → a skill (or a fact, if it is one line).
- "A worker method for structural exploration" → a preset.
- "Pick parents whose per-case scores complement each other" → a Sel strategy.
- "Prepare each candidate with selected context from the archive" → Var behavior, such as supplying the parent's other children's reports. Use the available file operations; change the existing Var or add an alternative when the preparation behavior needs to differ.
- "Check that every candidate compiles before the full evaluation" → an Eval strategy; it can register its own tool too if it needs one.
