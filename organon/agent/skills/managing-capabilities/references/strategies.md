# Search strategies

The search is made of small files in `agent/evolve/`, one folder per slot. The loop plugin loads the active file of each slot at the start of every chunk and makes no search decision itself. Strategies are kept across tasks, so each slot grows a catalog you combine per task.

## When

- A search behaviour the catalog does not give: a selection rule, a richer context for workers, another evaluation step, a survival rule, a loop pattern.
- A combination you will reuse: a **method**.
- A decision that belongs in none of the five slots: a **new slot**.

Choosing among existing strategies is part of running a task (`running-a-task/references/diagnose.md`).

## The slots

| Slot | Decides | Called as | Must do |
|---|---|---|---|
| `loop` | when the other slots run, and when the chunk ends | `loop(core, { k })` | run up to `k` attempts through `core`; may return a short summary, shown in the chunk summary |
| `sel` | what each attempt starts from | one-pick: `select(core)`; batch: `select(core, { n })` | return a new attempt with at least `parents` (one-pick), or an array of them (batch); return nothing to stop early |
| `var` | what files and context go into the candidate's folder and brief, and how the worker is called | `variate(core, a)` | `core.createCandidate(a)`, prepare the folder and brief, `core.spawn(...)`, save the worker's last message as `report.md`, and set `id`, `folder`, `preset`, `worker`, `report` on `a` |
| `eval` | how the candidate is scored | `evaluate(core, a)` | set `a.score` or `a.error` (and any other scores under their own names) |
| `surv` | which candidates stay selectable | `survive(core, attempts)` | set `alive` on the rows (and any archive statistics it keeps) |
| an added slot | its own decision | `fn(core, ...args)` | add its own keys |

**Each decision lives in its own slot.** A Loop never contains selection maths or brief text; a Var never picks parents. Slots never call each other: only the Loop does. A strategy may call another strategy of its own slot by name (`core.strategy`), which is how a portfolio mixes rules.

## A strategy file

```js
// agent/evolve/sel/tournament.js: picks the best of t random alive candidates
// reads: alive, score    writes: parents
export const settings = { t: 3 }

export default async function select(core) {
  const pool = core.rows().filter(r => r.alive === true && typeof r.score === 'number')
  if (pool.length === 0) throw new Error('sel/tournament: no alive, scored candidate')
  const drawn = Array.from({ length: core.settings.t }, () => pool[Math.floor(Math.random() * pool.length)])
  return { parents: [drawn.reduce((a, b) => (b.score > a.score ? b : a)).id] }
}
```

- **The default export** is the strategy function. **`settings`** (optional) are its defaults; `evolve_use({ settings: { <slot>: { … } } })` overrides them. **`export const batch = true`** makes a Sel receive `{ n }` and pick a whole batch at once.
- **The first lines** say what it decides and which row keys it reads and writes, so you can tell which strategies combine.
- **Keep the file self-contained.** A changed file is loaded afresh at the next chunk; a helper module it imports is not.
- **No versions.** An edited file keeps its name, and the rows keep stamping that name. To compare a new rule with the old one, write it under a new name.
- **Names** are lowercase with hyphens.
- **Errors are not hidden.** A throw ends the chunk: the attempts still running are cancelled, the candidates already created stay recorded, and `evolve_run` returns the error.

## `core`

| Member | Gives |
|---|---|
| `settings` | this strategy's settings, with the overrides merged in |
| `task` | `{ dir, program, statement, settings }`: the task folder, the program file name, the statement's path, `task.json` |
| `signal` | the chunk's cancellation signal |
| `rows()` | every candidate row, live: change a row in place and it is saved |
| `row(id)` | one row |
| `pending()` | attempts Sel has picked whose candidate is not created yet |
| `budget()` | `{ limit, used, remaining }` |
| `select(n)` | runs the active Sel: a one-pick Sel `n` times, each pick marked pending before the next; a batch Sel once |
| `variate(a)`, `evaluate(a)`, `survive(list)` | run the active Var, Eval or Surv |
| `slot(name)(...args)` | runs the active strategy of an added slot |
| `strategy(slot, name)(...args)` | runs another strategy of a slot, by name, with its own settings |
| `freePlace()` | resolves when Var has a free place; `variate` itself also waits for one |
| `createCandidate(a)` | the next id, its folder `search/candidates/<id>/`, and its row stamped with the active strategies; refuses when the budget is used up; returns `{ id, folder }` |
| `spawn({ preset, directory, brief, description })` | runs one worker in `directory` and waits for it; returns `{ worker, lastMessage, stopReason }` |
| `runEvaluator(a)` | runs the task's evaluator on the candidate's program and saves `search/evals/<id>.json`; returns `{ score, error, metrics, log }` |
| `evalResult(id)` | a candidate's saved evaluation, if any |
| `files.read / write / copy / exists / list` | files, with paths relative to the run folder; `copy` also copies a folder (never its `.organon/`), and `copy(from, to, { only: core.task.dir })` keeps only the paths that exist in the task folder |

**Concurrency** belongs to the slots' settings: Var's `maxConcurrent` limits workers at once, Eval's `maxConcurrent` limits evaluations at once. The core saves the rows after every slot call.

## Methods

A method is `agent/evolve/methods/<name>.json`, naming a strategy for the slots it defines; the others keep theirs:

```json
{ "sel": "mcts-uct", "surv": "mcts-backprop" }
```

`evolve_use({ method: "mcts" })` applies it. The method's name stays on the setup, and on new rows, only while every slot it defines still uses its strategy.

## Adding a slot

1. Write `agent/evolve/<slot>/<name>.js`.
2. Activate it: `evolve_use({ "<slot>": "<name>" })`. Remove it later with `evolve_use({ "<slot>": null })`.
3. Call it from a Loop strategy: `await core.slot('<slot>')(a)`. Write that Loop as a new file, so the existing ones stay intact.

## Combinations

Whether strategies make sense together depends on the row keys they share. The starting ones share `parents`, `preset`, `score`, `error` and `alive`. A Sel that walks a tree needs a Surv that writes the visits and values it reads; with `top-k`, nothing writes them. Choosing a sensible combination is your judgment; nothing checks it.

## Small examples

```js
// agent/evolve/sel/scratch.js: every attempt starts from nothing (e.g. when the baseline failed)
// reads: nothing    writes: parents
export default async function select() {
  return { parents: [] }
}
```

This one needs a `repair` preset (see `presets.md`):

```js
// agent/evolve/loop/repair-after-error.js: like refill; a failed candidate gets a repair attempt,
// counted within the chunk's k
// reads: error    writes: preset
export const settings = { preset: 'repair' }

export default async function loop(core, { k }) {
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

## Comparing strategies

The rows stamp which strategies built each candidate, so memory can compare them across runs.
