# Starting a run

Do these steps in order when you are given a task. The task folder is the folder DSH was opened on (your starting directory), unless the user names another one; the user gives you the candidate budget, and if it is missing, ask for it.

A task folder holds `statement.md`, the starting program, `task.json` and `evaluator/`. It is the project you improve: its files stay as they are, and every candidate is a copy. The evaluator is fixed: never change it.

## 1. Create the run folder

Runs live inside the task folder. Create:

```text
<task folder>/.organon/runs/<YYYY-MM-DD>_<NN>[_<label>]/
```

`NN` is the next free two-digit number for that date (`01`, `02`, …). The label is optional and says why the run exists (`trial`, `replay`, …). Example: `.organon/runs/2026-10-18_01/`.

If the task folder is inside a git repository and `.organon/` is not ignored yet, add `.organon/` to the `.gitignore` in the task folder (create it if needed). Otherwise there is nothing to do.

## 2. Fill it

1. **Write `run.json`.** `task` is the field the loop reads; the rest is the run's header.
   ```json
   {
     "task": "../../..",
     "purpose": "real",
     "budget": 100,
     "status": "running",
     "started": "<date and time>"
   }
   ```
   `task` is the task folder, relative to the run folder. `purpose` is `real`, `trial` or `replay`.
2. **Write `search/budget.json`:** `{ "limit": 100 }`, the candidate budget.

## 3. Move into the run folder

`working_directory({ cd: "<the run folder>" })`. The loop tools act on your current directory, so stay there until the run ends.

## 4. Record the baseline `c000000`

The task as given is the first candidate. It costs no budget, and the first chunk starts from it.

1. Copy the task folder, everything except `.organon/`, to `search/candidates/c000000/`.
2. Take the runner command from `evolve_status` (`evaluatorRunner`). Run it with the task folder and the absolute path of the program in that copy (`search/candidates/c000000/<program>`, `program` as named in `task.json`), using `<task folder>/evaluator` as the working directory and the `env` values of `task.json` set. An evaluation can take up to the task's `timeout`.
3. It prints one JSON line, `{"score": …, "error": …, "metrics": {…}}`; what the evaluator itself prints goes to stderr. Save the JSON line to `search/evals/c000000.json` **with the write tool**. A shell redirect in Windows PowerShell writes UTF-16, which the loop cannot read.
4. Write the first line of `search/candidates.jsonl` with the write tool:
   - scored: `{"id":"c000000","parents":[],"score":<score>,"alive":true}`
   - failed: `{"id":"c000000","parents":[],"error":"<error>","alive":false}`

The default Sel, `rank`, needs an alive, scored candidate. If the baseline failed, run the first chunk with a Sel that starts from nothing (`{ parents: [] }`); see `managing-capabilities/references/strategies.md`.

## 5. Understand the task

Read `statement.md`, `task.json` and the baseline's result: what is scored and in which direction, how long one evaluation takes, how a program can fail, and what the evaluator's feedback looks like (`metrics`, and the log on stderr).

## 6. Recall

Follow the task-start steps of the `memory` skill. `agent/AGENTS.md` is already in your context; beyond it, look at the overview for this benchmark, the one or two past runs most alike by fingerprint, and the lessons whose conditions match.

## 7. Choose the capabilities for this task

Look at every bundle in `agent/plugins/`, active or not. Enable the ones that fit this task and disable the ones left from earlier tasks that do not. Never delete a plugin at task start: a later task may need it. Skills are found automatically.

## 8. Set up the first chunk

`evolve_status` shows the active setup. By default it is L₀, population evolution: Loop `refill`, Sel `rank`, Var `default` with the `mutator` preset, Eval `single`, Surv `top-k`. Change it with `evolve_use` only when memory or the task gives a reason, for example a smaller `settings.var.maxConcurrent` when evaluations are slow.

Write `scratch/plan.md`: the setup you chose, the lessons you applied, the effect you expect, and the chunk size `k` you will start with. Then run the first chunk and continue with `diagnose.md`.

## Checklist

```text
<task folder>/.organon/runs/<run>/
├── run.json                          task, purpose, budget, status, started
├── search/
│   ├── budget.json                   { "limit": N }
│   ├── candidates.jsonl              the c000000 row
│   ├── candidates/c000000/           a copy of the task folder, without .organon/
│   └── evals/c000000.json            the runner's JSON line
└── scratch/plan.md
```
