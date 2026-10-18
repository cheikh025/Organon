# Choosing the kind

Ask what the thing is, then pick the lightest kind that does the job.

| What you have | Kind | Because |
|---|---|---|
| Knowledge: a fact about the environment, a lesson about directing the search, a hint for workers | **memory** | it is read when it applies; see the `memory` skill |
| A procedure you follow by reading it | **skill** | flexible and cheap, but it works only when you load and follow it |
| A way of working for a worker: its stance, method and tools | **preset** | workers know only their preset and brief |
| A way of searching: how parents are picked, candidates built, scored or kept, or when the slots run | **strategy** in `agent/evolve/` | it runs inside the loop on every attempt, and combines with the other slots |
| Something that must happen by itself: every time, mechanically, heavy to compute, or hooked into the harness | **plugin** | it acts without being remembered |

**Rule of thumb:** start as a skill or a strategy; turn something into a plugin once it is stable, frequent and mechanical, or when it needs its own tool or a hook into the harness.

**Not a capability:** the content of a solution. Algorithms, parameters and code of a candidate stay in the run folder. A hint about an approach can become an idea in memory, worded as an option for workers; it never goes into a preset, a strategy or the main agent's lessons.

Examples:
- "IO time counts toward the time limit" → a fact in memory.
- "When gains stall and diversity is low, explore beats more refining" → a lesson in memory.
- "How to reload a linked bundle after editing it" → a skill (or a fact, if it is one line).
- "Study the parent and design a structurally different approach" → a preset (`explore`).
- "Pick parents whose per-case scores complement each other" → a Sel strategy.
- "Check that every candidate compiles before the full evaluation" → an Eval strategy; a plugin only if it needs its own tool.
