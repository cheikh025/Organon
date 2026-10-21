# Search strategies

The search is made of small plugins in `agent/evolve/`, the `@organon/evolve` bundle, one folder per slot. Each plugin registers one strategy for one slot with the loop plugin's `evolve` service; the loop plugin runs the registered strategy of each slot in every chunk and makes no search decision itself. The strategies you keep after a task stay for later ones, so each slot grows a catalog you combine per task.

## When

- A search behaviour the catalog and its settings do not give: a selection rule, a richer context for workers, another evaluation step, a survival rule, a loop pattern.
- A combination you will reuse: a **method**.
- A decision that belongs in none of the five slots: a **new slot**.

Choosing among existing strategies is part of running a task (`running-a-task/references/diagnose.md`).

## The slots

| Slot | Decides | Called as | Must do |
|---|---|---|---|
| `loop` | when the other slots run, and when the chunk ends | `loop(core, { k })` | run up to `k` attempts through `core`; may return a short summary, shown in the chunk summary |
| `sel` | what each attempt starts from | one-pick: `select(core)`; batch: `select(core, { n })` | return a new attempt with at least `parents` (one-pick), or an array of them (batch); return nothing to stop early |
| `var` | what files and context go into the candidate's folder, and how the worker is called | `variate(core, a)` | `core.createCandidate(a)`, prepare the folder and the worker's first message (the folder's contents), `core.spawn(...)`, save the worker's last message as `report.md`, and set `id`, `folder`, `preset`, `worker`, `report` on `a` |
| `eval` | how the candidate is scored | `evaluate(core, a)` | set `a.score` or `a.error` (and any other scores under their own names) |
| `surv` | which candidates stay selectable | `survive(core, attempts)` | set `alive` on the rows (and any archive statistics it keeps) |
| an added slot | its own decision | `fn(core, ...args)` | add its own keys |

**Each decision lives in its own slot.** A Loop never contains selection maths; a Var never picks parents. Slots never call each other: only the Loop does. A strategy may import and call another strategy's function, which is how a portfolio mixes rules.

## A strategy plugin

```js
// agent/evolve/sel/tournament.js: picks the best of t random alive candidates
// reads: alive, score    writes: parents
export const name = 'organon-sel-tournament'
export const inject = ['evolve']

export function apply(ctx, config) {
  ctx.effect(() => ctx.evolve.strategy('sel', 'tournament', select, { settings: { t: 3, ...config } }))
}

export async function select(core) {
  const pool = core.rows().filter(r => r.alive === true && typeof r.score === 'number')
  if (pool.length === 0) throw new Error('sel/tournament: no alive, scored candidate')
  const drawn = Array.from({ length: core.settings.t }, () => pool[Math.floor(Math.random() * pool.length)])
  return { parents: [drawn.reduce((a, b) => (b.score > a.score ? b : a)).id] }
}
```

Its row in `agent/evolve/cordis.patch.yml`:

```yaml
- insert:
    - id: sel-tournament
      name: '@organon/evolve/sel/tournament'
      config:
        t: 5
```

- **`ctx.evolve.strategy(slot, name, fn, { settings, batch })`** registers the strategy; inside `ctx.effect`, the registration ends when the plugin stops. `name` is what the rows stamp. **`settings`** are what `core.settings` holds: the file's defaults with the row's `config` over them. **`batch: true`** makes a Sel receive `{ n }` and pick a whole batch at once.
- **Export the strategy function**, so other strategies can import it.
- **The first lines** say what it decides and which row keys it reads and writes, so you can tell which strategies combine.
- **No versions.** Edit the file in place: it keeps its name, and the rows keep stamping that name. To compare a new rule with the old one, write it under a new name.
- **Names** are lowercase with hyphens; the plugin's `name` is `organon-<slot>-<name>` and the row id `<slot>-<name>`.
- **Errors are not hidden.** A plugin that fails to load stays off, and the `plugin_manager` result reports the error. A throw inside a chunk ends it: the attempts still running are cancelled, the candidates already created stay recorded, and `evolve_run` returns the error.

## Enabling, switching and reloading

An enabled row is the active strategy of its slot. Each slot has one: `evolve_run` refuses a slot with two, and `evolve_status` shows them under `active`.

| To | Do |
|---|---|
| switch a slot to another strategy | `plugin_manager` `set_plugin` the old row's id off and the new one on |
| change a strategy's settings | edit its row's `config` in `agent/evolve/cordis.patch.yml`, then reload |
| change a strategy's code | edit its file, then reload |
| add a strategy | write its file and its row (`disabled: true` while another strategy holds the slot), then reload or switch to it |

**Reload** is one `plugin_manager` call: `set_bundle` with `@organon/evolve` and `enabled: true`. DSH reads the bundle's patch again and replaces every plugin whose files changed, including a helper module a strategy imports. `set_plugin` records its switch in the profile, over the row's own `disabled`. Changes apply to the next chunk; never reload while `evolve_run` is running.

## `core`

| Member | Gives |
|---|---|
| `settings` | this strategy's settings |
| `task` | `{ dir, program, statement, settings }`: the task folder, the program file name, the statement's path, `task.json` |
| `signal` | the chunk's cancellation signal |
| `rows()` | every candidate row, live: change a row in place and it is saved |
| `row(id)` | one row |
| `pending()` | attempts Sel has picked whose candidate is not created yet |
| `budget()` | `{ limit, used, remaining }` |
| `select(n)` | runs the active Sel: a one-pick Sel `n` times, each pick marked pending before the next; a batch Sel once |
| `variate(a)`, `evaluate(a)`, `survive(list)` | run the active Var, Eval or Surv |
| `slot(name)(...args)` | runs the active strategy of an added slot |
| `freePlace()` | resolves when Var has a free place; `variate` itself also waits for one |
| `createCandidate(a)` | the next id, its folder `search/candidates/<id>/`, and its row stamped with the active strategies; refuses when the budget is used up; returns `{ id, folder }` |
| `spawn({ preset, directory, message, description })` | runs one worker in `directory` and waits for it; `message` is its first message; returns `{ worker, lastMessage, stopReason }` |
| `runEvaluator(a)` | runs the task's evaluator on the candidate's program and saves `search/evals/<id>.json`; returns `{ score, error, metrics, log }` |
| `evalResult(id)` | a candidate's saved evaluation, if any |
| `files.read / write / copy / exists / list` | files, with paths relative to the run folder; `copy` also copies a folder (never its `.organon/`), and `copy(from, to, { only: core.task.dir })` keeps only the paths that exist in the task folder |

**Concurrency** belongs to the slots' settings: Var's `maxConcurrent` limits workers at once, Eval's `maxConcurrent` limits evaluations at once. The core saves the rows after every slot call.

## Methods

A method is a group row naming a strategy for the slots it defines. L₀ is the `population-evolution` group:

```yaml
- insert:
    - id: mcts
      name: cordis:group
      group: true
      disabled: true
      config:
        - id: sel-mcts-uct
          name: '@organon/evolve/sel/mcts-uct'
        - id: surv-mcts-backprop
          name: '@organon/evolve/surv/mcts-backprop'
```

To switch method, `set_plugin` the slots' current rows off and the group on. The rows stamp each slot's strategy, not the method.

## Adding a slot

1. Write `agent/evolve/<slot>/<name>.js`, registering with `ctx.evolve.strategy('<slot>', '<name>', fn)`, and its row.
2. Call it from a Loop strategy: `await core.slot('<slot>')(a)`. Write that Loop as a new plugin, so the existing ones stay intact, and switch the `loop` slot to it.
3. Remove the slot later by disabling its row.

## Combinations

Whether strategies make sense together depends on the row keys they share. The starting ones share `parents`, `preset`, `score`, `error` and `alive`. A Sel that walks a tree needs a Surv that writes the visits and values it reads; with `top-k`, nothing writes them. Choosing a sensible combination is your judgment; nothing checks it.

## Small examples

```js
// agent/evolve/sel/scratch.js: every attempt starts from nothing (e.g. when the baseline failed)
// reads: nothing    writes: parents
export const name = 'organon-sel-scratch'
export const inject = ['evolve']

export function apply(ctx, config) {
  ctx.effect(() => ctx.evolve.strategy('sel', 'scratch', select, { settings: { ...config } }))
}

export async function select() {
  return { parents: [] }
}
```

A portfolio that mixes two rules imports their functions; their settings come from the portfolio's own:

```js
// agent/evolve/sel/portfolio.js: mostly rank, sometimes a uniform pick
// reads: alive, score    writes: parents
import { select as rank } from './rank.js'

export const name = 'organon-sel-portfolio'
export const inject = ['evolve']

export function apply(ctx, config) {
  ctx.effect(() => ctx.evolve.strategy('sel', 'portfolio', select, { settings: { pressure: 1.0, uniformProb: 0.2, ...config } }))
}

export async function select(core) {
  if (Math.random() >= core.settings.uniformProb) return rank(core)
  const pool = core.rows().filter(r => r.alive === true)
  return { parents: [pool[Math.floor(Math.random() * pool.length)].id] }
}
```

This one needs a `repair` preset (see `presets.md`):

```js
// agent/evolve/loop/repair-after-error.js: like refill; a failed candidate gets a repair attempt,
// counted within the chunk's k
// reads: error    writes: preset
export const name = 'organon-loop-repair-after-error'
export const inject = ['evolve']

export function apply(ctx, config) {
  ctx.effect(() => ctx.evolve.strategy('loop', 'repair-after-error', loop, { settings: { preset: 'repair', ...config } }))
}

export async function loop(core, { k }) {
  let started = 0
  const running = []
  const attempt = async (a) => {
    await core.variate(a)
    await core.evaluate(a)
    await core.survive([a])
    if (a.error != null && started < k) {
      started += 1
      await attempt({ parents: [a.id], preset: core.settings.preset })
    }
  }
  while (started < k) {
    await core.freePlace()
    if (started >= k) break // a repair may have taken the last place while we waited
    started += 1
    const [a] = await core.select(1)
    running.push(attempt(a))
  }
  await Promise.all(running)
}
```

## Bad examples, and what is wrong

**1. A Sel that returns the parents you chose:**
```js
// agent/evolve/sel/fixed.js
export async function select(core) {
  return { parents: core.settings.parents }
}
```
With ids set in its row's `config`, this is you picking parents by hand, which your role excludes. A Sel decides by a rule over the rows (rank, novelty, complementary per-case scores); express what you want as that rule or its settings.

**2. A wrapper Var that creates the candidate twice:**
```js
import { variate as base } from './default.js'

export async function variate(core, a) {
  const { folder } = await core.createCandidate(a)
  await core.files.write(`${folder}/profile.txt`, '...')
  return base(core, a)   // var/default calls createCandidate(a) again
}
```
Every `createCandidate` call allocates a new id and costs one budget unit, so this attempt gets two ids, two budget units and two rows, and the first folder is abandoned. `var/default` creates the candidate and starts the worker in one call, so nothing can be added between those steps from outside it.

## Comparing strategies

The rows stamp which strategies built each candidate, so memory can compare them across runs.
