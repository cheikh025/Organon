---
name: managing-capabilities
description: Use when deciding whether to create, change, keep or remove one of your capabilities - a memory item, a skill, a worker preset, a search strategy or a plugin - and when building one; also at task start to choose which plugins to enable, and at task end to curate.
---

# Managing capabilities

Everything you can do beyond the base harness is a capability you may create, change or remove. Nothing about them is fixed; only the task's own evaluator is. Evaluators you build for the search are capabilities like the others.

## The five kinds

| Kind | Holds | Lives in | Takes effect |
|---|---|---|---|
| Memory | knowledge: facts, lessons, history, ideas | `agent/memory/` | when it is read; see the `memory` skill |
| Skill | a procedure you follow by reading it | `agent/skills/<name>/` | at once: skills are found live |
| Preset | a worker's way of working and its tools | a preset row in a bundle in `agent/plugins/<bundle>/` | for workers started after it is installed |
| Strategy | one search decision: how parents are picked, candidates built, scored or kept, or when slots run | `agent/evolve/<slot>/<name>.js`; methods in `agent/evolve/methods/` | at the next chunk |
| Plugin | something that runs by itself: a tool, a background reaction, a service | a bundle in `agent/plugins/<name>/` | once installed; after an edit, once reloaded |

Which kind fits a need: `references/choosing.md`.

## Lifecycle

1. **Create** when a need recurs or a run showed a gap. Start small, as the lightest kind that works.
2. **Try** it where you can see its effect: a strategy in one chunk, a preset in one worker, a plugin in one call.
3. **Keep, change or remove** on evidence from runs: the rows, the chunk summaries, the history entries. One bad run does not condemn a capability; one good run does not prove it.
4. **Remove at task end, never at task start**: a capability unused today may fit the next task.

## Record every change

- In the run's history entry, under "Capabilities": what was enabled, built, changed or deleted, and why (see the `memory` skill).
- In `agent/AGENTS.md`, the list of plugins: what each fits, and its evidence. Skills are not listed there; DSH lists them.

## When

- **Task start:** look at every bundle in `agent/plugins/`; enable the ones that fit the task, disable the ones that do not. Do not delete.
- **During a run:** create or change what the run needs: a strategy between chunks, a preset when a kind of work keeps coming back, a tool when a check is mechanical.
- **Task end:** promote what proved useful from the run's `scratch/`, generalise it (no run paths, no task-specific constants), and delete one-offs, broken and superseded capabilities.

## Read next

| Need | File |
|---|---|
| Which kind fits | `references/choosing.md` |
| A skill | `references/skills.md` |
| A plugin | `references/plugins.md` |
| A worker preset | `references/presets.md` |
| A search strategy, method or slot | `references/strategies.md` |

These files live in this skill's base directory, which the `skill` tool reported. For the mechanics they point to the DSH skills: `cordis-plugin-development`, `editing-cordis-compositions`, `cordis-composition-reference` and `agent-experience`.
