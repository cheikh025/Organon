# Worker presets

A preset is a worker's way of working: its persona (stance, method, what to deliver) and its tools. The brief says what to work on; the preset says how. A preset can be general or made for the task at hand; the ones you keep after a task are the directions memory talks about (`mutator`, `explore`, `refine`, …).

## When

Whenever the existing presets do not fit the work: for example, attempts that should deliberately try a structurally different approach (`explore`), fix a broken parent with a minimal change (`repair`), or combine two parents (`merge`); work this task needs done its own way (its tools, how to build and test, a stance or an approach); or a kind of support work (analysis, testing).

## What goes in

- **The persona:** the stance and method, anything about the task every worker needs, and what the final message must say. For solving presets, end with the same report shape as `mutator`: at most about 10 lines on what changed, why, what to expect, whether an optional idea was used, and anything else worth knowing; the next worker gets it as `parent_report.md`.
- **The tools it needs:** usually the file tools, the shell, `tool-jobs` (to read commands that outlive their time limit) and compaction.
- **Never:** delegation or tools that change the host. The worker plugin blocks those tools anyway, confines the worker to its folder, and hides every global tool, so a worker has exactly its preset's tools.
- **No `agent-instructions` row,** so workers never see `AGENTS.md`, and no skills unless you mean the worker to have them.

## How

A preset is one `@deepseek-ai/dsh-agent-preset` row in a bundle patch. Put your presets in a bundle of your own in `agent/plugins/<bundle>/` (`package.json` with `dsh.bundle.patch`, and `cordis.patch.yml`), install it with `plugin_manager` (`install_bundle`), and reload it with a no-op `set_bundle … enabled: true` after edits. Label worker presets `"<Name> (worker)"` with an `order` of 100 or more, so they sit apart from session modes. The `editing-cordis-compositions` skill has the declaration format; `cordis-composition-reference` lists the plugin packages.

A template, adapted from the starting `mutator` preset (in `agent/plugins/worker/cordis.patch.yml`):

```yaml
- insert:
    - id: preset-explore
      name: '@deepseek-ai/dsh-agent-preset'
      config:
        id: explore
        name: Explore (worker)
        description: Organon worker that tries a structurally different approach from its parent.
        order: 101
        plugins:
          - id: persona
            name: '@deepseek-ai/dsh-persona'
            config:
              prefix: >-
                You are a worker that … (stance, method, and the final message of at most 10 lines).
          - id: tool-bash
            name: '@deepseek-ai/dsh-tool-bash'
            disabled: !!js process.platform === 'win32'
          - id: tool-pwsh
            name: '@deepseek-ai/dsh-tool-pwsh'
            disabled: !!js process.platform !== 'win32'
          - id: tool-fs
            name: '@deepseek-ai/dsh-tool-fs'
          - id: tool-jobs
            name: '@deepseek-ai/dsh-tool-jobs'
          - id: compaction
            name: cordis:group
            group: true
            isolate:
              compaction: true
              toolResultPruner: true
            config:
              - id: compaction-basic
                name: '@deepseek-ai/dsh-compaction-basic'
              - id: tool-result-pruner
                name: '@deepseek-ai/dsh-compaction-tool-result-pruner'
                config:
                  thresholdChars: 8192
```

## Use, try, remove

- **Use:** `evolve_use({ preset: "explore" })` for all attempts of the next chunks; a Loop strategy that sets `a.preset` per attempt; or `spawn_worker({ preset: "explore", … })` for one worker.
- **Try it first:** one `spawn_worker` with the new preset on a copy of a candidate in `scratch/`, before a chunk depends on it.
- **Changes** apply to workers started afterwards; running workers keep the version they started with. Record each change in the history entry, so lessons know which version they are about.
- **Remove** a preset at task end when memory shows it does not help: delete its row and reload, or remove its bundle.
