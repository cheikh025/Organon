# Choosing the kind

First ask whether existing tools, settings, messages or files already express what you need. An ordinary operation need not become a new capability. When new behavior is needed, identify what it does and choose the lightest kind that fits.

| What you have | Kind | Because |
|---|---|---|
| Knowledge: a fact about the environment, a lesson about directing the search, a hint for workers | **memory** | it is read when it applies; see the `memory` skill |
| A procedure you follow by reading it | **skill** | flexible and cheap, but it works only when you load and follow it |
| A role for a worker: its purpose, method, constraints and tools | **preset** | it shapes every worker that uses it, with the attempt context Sel and Var supply |
| A way of searching: how parents are picked, candidates built, scored or kept, or when the slots run | **strategy** in `agent/evolve/` | it runs inside the loop on every attempt, and combines with the other slots |
| Something that must happen by itself: every time, mechanically, heavy to compute, or hooked into the harness | **plugin** | it acts without being remembered |

**Rule of thumb:** a skill records a procedure; a strategy executes a search decision; a plugin supplies a tool, service or event reaction in the harness. Extend an existing capability when it already owns the operation. These forms can work together; they are not steps you must go through in order.

**General or specific:** during a run, build whatever solves the task best, general or made for this task, with any task content it needs. What you keep after the task never carries this task's solution: the algorithms, parameters and code of its candidates stay in the run folder. A hint about an approach can become an idea in memory, worded as an option for workers.

Examples:
- "IO time counts toward the time limit" → a fact in memory.
- "When gains stall and diversity is low, explore beats more refining" → a lesson in memory.
- "How to reload a linked bundle after editing it" → a skill (or a fact, if it is one line).
- "Study the parent and design a structurally different approach" → a preset (`explore`).
- "Pick parents whose per-case scores complement each other" → a Sel strategy.
- "Prepare each candidate with selected context from the archive" → Var behavior, such as supplying the parent's other children's reports. Use the available file operations; change the existing Var or add an alternative when the preparation behavior needs to differ.
- "Check that every candidate compiles before the full evaluation" → an Eval strategy; a plugin only if it needs its own tool.
