# Planned features

Features agreed, and whether they are built.

## 1. Portable install: clone, install, and it works (done, 2026-10-17)

**Goal:** anyone can clone the repo on any machine, install the Organon bundles into DSH, and use them, without setting machine-specific paths or environment variables.

**Built:** every piece finds the folder it needs relative to its own location, since the bundles always live in `agent/plugins/<name>/`. `DSH_AGENTS_HOME` is not needed.

| Piece | Finds | How |
|---|---|---|
| Loop plugin | `agent/evolve/` | relative to its own source file: `new URL('../../../evolve', import.meta.url)` from `plugins/loop/src/` (`strategies.js`, `evolveDir()`) |
| Organon preset | `agent/skills/` | relative to its own package, from the patch's `!!js` expression: `createRequire(baseUrl).resolve('@organon/preset/package.json')`, then two folders up to `agent/`, then `skills` (the `skill-filesystem` row) |
| Memory plugin | `agent/AGENTS.md`, `agent/memory/` | relative to its own source file: `new URL('../../../', import.meta.url)` from `plugins/memory/src/`. It puts `AGENTS.md` in the Organon agent's system prompt itself, because DSH's `agent-instructions` reads the shared `AGENTS.md` only from `$DSH_AGENTS_HOME` or `~/.agents` |

Why this works:
- **Linked bundles keep their real location.** `dsh plugin add <folder>` links the folder into the profile, and DSH resolves a linked bundle to its real path (`linkedRoots` → `realPath` in DSH's profile resolution). A plugin's `import.meta.url` is therefore its file inside the clone, wherever the clone is.
- **`baseUrl` in a patch is the profile folder, not the bundle folder.** DSH sets the Loader's `baseUrl` to the folder of the profile's config file, so a patch can't point at its own folder directly. Resolving its own package name through the profile, as DSH's Creator preset does to find its bundled skills, gives the bundle's real folder.

**Install on a new machine:**
1. Install DSH 0.2.1-rc.2.
2. Clone the repo.
3. Install the four packages into the DSH profile:
   ```powershell
   dsh plugin --profile web add <clone>\organon\agent\plugins\worker
   dsh plugin --profile web add <clone>\organon\agent\plugins\organon-preset
   dsh plugin --profile web add <clone>\organon\agent\plugins\loop
   dsh plugin --profile web add <clone>\organon\agent\plugins\memory
   ```
   The memory package has no bundle patch (the Organon preset mounts it), so DSH warns that it is installed as a plain dependency. That is expected.
4. Have Python on `PATH` for the evaluators, or set the loop plugin's `python` config, with each task's evaluator dependencies installed.
5. Start `dsh web` and pick **Organon mode**.

## 2. Workers visible in DSH web (done, 2026-10-18)

**Goal:** workers show in DSH web like DSH's own subagents: listed in the parent session's header, each opening as a read-only conversation. A worker should differ from DSH's spawn only in its confinement and in having no follow-ups.

**Why it was needed:** the worker plugin creates each worker directly with `ctx.agents.create`, not through DSH's subagent service (`ctx.subagents`). DSH web hides subagent sessions from the sidebar and lists a session's children only from records in its log, which that service writes, so the workers were hidden. Running workers through `ctx.subagents` does not fit rc.2: a local child always starts in the parent's folder, which is its sandbox's write root, so the confinement would be lost; an external provider's child is listed in DSH web but cannot be opened.

**Built:** the worker plugin writes the two records DSH's subagent service writes for a one-shot child (`plugins/worker/src/workers.js`; DSH's `packages/subagent/subagent/src/manager.ts` at `dsh-v0.2.1-rc.2`):
- on the worker's session, in the setup hook: a `subagent/descriptor` record saying the worker is one-shot, with its description as the label and `organon-worker` as its provider;
- on the parent's session, once the worker exists: a `subagent/catalog` record with the worker's id, its creation time, one-shot, and the label.

The provider name is read only when DSH resumes a continuable child, so an unknown name does no harm to a one-shot worker. It takes effect after DSH restarts.
