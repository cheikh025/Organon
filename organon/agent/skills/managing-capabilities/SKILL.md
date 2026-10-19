---
name: managing-capabilities
description: Use when deciding whether to create, change, keep or remove one of your capabilities - a memory item, a skill, a worker preset, a search strategy or a plugin - and when building one; also at task start to choose which plugins to enable, and at task end to curate.
---

# Managing capabilities

Your capabilities let you conduct and improve the search. You may create, change or remove them, including the procedures in these skills. The task's evaluator and its evaluation inputs stay fixed. Evaluators you build for the search are capabilities too: you may design, combine, revise and co-evolve them while the task's evaluator remains the final measure.

## The five kinds

| Kind | Holds | Lives in | Takes effect |
|---|---|---|---|
| Memory | knowledge: facts, lessons, history, ideas | `agent/memory/` | when it is read; see the `memory` skill |
| Skill | a procedure you follow by reading it | `agent/skills/<name>/` | at once: skills are found live |
| Preset | a worker's role: its persona and tools | a preset row in a bundle in `agent/plugins/<bundle>/` | for workers started after its bundle is installed or reloaded |
| Strategy | one search decision: how parents are picked, candidates built, scored or kept, or when slots run | `agent/evolve/<slot>/<name>.js`; methods in `agent/evolve/methods/` | at the next chunk |
| Plugin | something that runs by itself: a tool, a background reaction, a service | a bundle in `agent/plugins/<name>/` | once installed; after an edit, once reloaded |

Which kind fits a need: `references/choosing.md`.

## Lifecycle

1. **Use, change or create** what the work needs, general or task-specific. Use existing interfaces when they fit; extend or create a capability when a different behavior is useful.
2. **Try** it where you can see its effect: a strategy in one chunk, a preset in one worker, a plugin in one call.
3. **Keep, change or remove** on evidence from runs: the rows, the chunk summaries, the history entries. One bad run does not condemn a capability; one good run does not prove it.
4. **Remove at task end, never at task start**: a capability unused today may fit the next task.

## Record every change

- In the run's history entry, under "Capabilities": what was enabled, built, changed or deleted, and why (see the `memory` skill).
- In `agent/AGENTS.md`, the list of plugins: what each fits, and its evidence. Skills are not listed there; DSH lists them.

## When

- **Task start:** look at every bundle in `agent/plugins/`; enable the ones that fit the task, disable the ones that do not. Do not delete.
- **During a run:** create or change whatever helps solve the task, general or made for it: a strategy, a preset, a tool, an evaluator, a skill.
- **Task end:** keep what may help later tasks, judged by usefulness, not generality, without this task's solution or run paths; delete what is broken, superseded or unlikely to help again.

## Read next

| Need | File |
|---|---|
| Which kind fits | `references/choosing.md` |
| A skill | `references/skills.md` |
| A plugin | `references/plugins.md` |
| A worker preset | `references/presets.md` |
| A search strategy, method or slot | `references/strategies.md` |

These files live in this skill's base directory, which the `skill` tool reported. For the mechanics they point to the DSH skills: `cordis-plugin-development`, `editing-cordis-compositions`, `cordis-composition-reference` and `agent-experience`.

**Changing a worker preset needs no restart and no new session.** Edit its row in the bundle that holds it, then reload that bundle with `plugin_manager` (`set_bundle`, `enabled: true`); a new bundle is installed once with `install_bundle`. The result's `application` says whether the change is live. Workers mount their preset when they start, so every worker started afterwards uses the new version; running workers keep theirs. Where `editing-cordis-compositions` says to reinstall a bundle and validate in a new session, that is about session presets, not workers.
