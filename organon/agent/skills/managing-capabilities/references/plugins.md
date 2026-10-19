# Plugins

A plugin is code that the harness runs for you. Build one when a step must happen every time, is mechanical, is heavy to compute, or needs to hook into the harness; otherwise a skill or a strategy is cheaper.

## The types that matter

| Type | What it does | Example |
|---|---|---|
| Tool | a tool you call | a diagnostic over the rows, a lineage report |
| Background plugin | reacts to events without being called | the memory plugin reminding you at a long stall, after a compaction and at task end |
| Service | used by other plugins | the `workers` service the loop uses |

MCP connections and UI plugins exist but rarely fit.

A search strategy is a file in `agent/evolve/`, not a plugin (see `strategies.md`). Write a plugin for search only when a strategy needs its own tool or a hook into the harness.

The loop plugin (`evolve_status`, `evolve_use`, `evolve_run`) and the worker plugin (`spawn_worker`, the `workers` service) are capabilities like any other. A change that helped a run (a new parameter, a report, another way to run a chunk) stays for later tasks; one that didn't is undone at task end. Record each change in the history entry.

## How

1. **Write the bundle** in `agent/plugins/<name>/`: `package.json` (with `dsh.bundle.patch`), `cordis.patch.yml` inserting the plugin row, the code (`index.js` exporting `apply`), and the display files (`locale/en.json`, an icon). The `cordis-plugin-development` skill has the templates and rules; `cordis-composition-reference` has the patch dialect and the packages you can build on.
2. **Install it** with `plugin_manager`, action `install_bundle`, target the absolute folder. Read the result: `application` and `warnings` say whether it is live.
3. **Use it** once to confirm it works before relying on it.
4. **After editing its code,** reload it with one no-op `set_bundle` on its package with `enabled: true`: the harness replaces the changed module in about half a second. Do not install again: installing over an installed bundle is refused.
5. **Remove it** with `remove_bundle`. The folder stays; delete it at task end if the plugin is gone for good.

Installed bundles survive a restart. Every `plugin_manager` call needs approval unless the session has full access.

## Keep track

- List each plugin in `agent/AGENTS.md`: what it fits, and its evidence.
- Record installs, changes and removals in the run's history entry.
- At task end, leave on the plugins the next task is likely to use and disable the others; enable what fits at the next task's start.
