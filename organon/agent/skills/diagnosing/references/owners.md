# Who owns which behaviour

A diagnosis names the capability whose change addresses the cause. This is where each behaviour of a run is decided in the starting setup; when you add or move a capability, keep this table true.

| Behaviour | Owner | Where |
|---|---|---|
| What a worker is given: files in its folder, its first message | the active Var | `agent/evolve/var/*.js` |
| How a worker works: its method, what it checks, how it reports | the preset's persona | the preset row, e.g. `agent/plugins/worker/cordis.patch.yml` |
| What a worker can use: tools, folder confinement | the preset's tools; the worker plugin | the preset row; `agent/plugins/worker/src/confine.js` |
| How long a worker has, and how it is told | Var `timeLimit`; the worker plugin's clock | the Var row's `config`; `agent/plugins/worker/src/clock.js` |
| How many workers run at once | Var `maxConcurrent` | the Var row's `config` |
| Which candidates become parents | the active Sel | `agent/evolve/sel/*.js` and its row |
| Which candidates stay selectable | the active Surv | `agent/evolve/surv/*.js` and its row |
| What is measured, and how often | the active Eval; evaluators you built | `agent/evolve/eval/*.js` and its row |
| When attempts start, which preset each gets, when a chunk ends | the active Loop; `k` | `agent/evolve/loop/*.js` and its row |
| What you remember and are reminded of | memory; the memory plugin | `agent/memory/`; `agent/plugins/memory/` |
| How you run, diagnose, change and curate | your skills | `agent/skills/` |

A slot that none of these fits is a new slot (`managing-capabilities/references/strategies.md`).

## Forms of fix

For the same cause, the form matters as much as the owner. What harness studies found, as tendencies rather than rules:

- **A mechanism over advice.** A file Var stages, a tool, a check the worker plugin runs, a Loop that routes attempts: these act every time. A sentence in a persona can be skipped. Prompt-only changes were the ones that regressed in those studies; changes at the points where an agent acts or reads feedback carried the gains.
- **Make it reach the worker.** A fix in a place workers do not look does nothing (`why_not: not applied`). Check a transcript after the change.
- **Add before you rewrite.** Adding information or a check rarely breaks what works; rewriting a working flow often does.
- **Narrow before broad.** A fix scoped to the cases the evidence covers breaks less than one that changes every attempt.
