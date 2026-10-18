# Evolve kit: Organon

Organon is a self-improving agent for DeepSeek Harness (DSH) 0.2.1-rc.2. Given a task folder and a candidate budget, its main agent directs an evolutionary search (workers build candidates, the task's fixed evaluator scores them), improves the search between chunks, and keeps memory across tasks.

```text
evolve-kit/
├── organon/
│   ├── agent/
│   │   ├── AGENTS.md        always in the main agent's context: starting rules + memory index
│   │   ├── plugins/         organon-preset (Organon mode), loop, worker, memory
│   │   ├── skills/          running-a-task, managing-capabilities, memory, and four DSH Creator skills
│   │   ├── evolve/          search strategies by slot (loop, sel, var, eval, surv) and methods
│   │   └── memory/          facts, lessons, history, ideas, overviews (written by the agent)
│   └── FEATURES.md          planned and built features
├── final_eval.py            final score of a finished ALE-Bench run (private evaluation)
├── private_eval.py          the ALE-Bench private evaluation that final_eval.py runs
└── tasks/
    ├── ale_bench/           10 ALE-Bench problems (ahc008, ahc011, ...)
    ├── frontier_cs/         172 Frontier-CS problems (0, 1, 10, ...)
    ├── math/                math problems (circle_packing, heilbronn_triangle, ...)
    ├── adrs/, kernelbench/  ADRS and KernelBench tasks
    ├── kernel_builder/      CORAL VLIW SIMD tree-traversal optimization (CPU simulator)
    └── evaluator_sources.json   where each evaluator was taken from
```

The previous implementation (EvoRSI on DSH 0.1.7: `plugins/`, `dist/`, `setup.sh`, `PROMPT.md`) is kept in git under the tag `evorsi-v1`.

## Requirements

| what | version |
| --- | --- |
| DeepSeek Harness | a source clone at tag `dsh-v0.2.1-rc.2`, built (`pnpm install`, `pnpm run build`) |
| Node.js, pnpm | as the DSH clone requires |
| Python | 3.11 to 3.14, reachable as `python`, with each task's evaluator dependencies |
| Docker | for the ALE-Bench and Frontier-CS judges only |

Tasks whose evaluators need only the standard library or numpy (`math`, `kernel_builder`) run as they are. ALE-Bench needs its Python package and Docker images, and Frontier-CS its judge server; setting those up is not automated yet (the old `setup.sh` under `evorsi-v1` shows how it was done).

## Install

Link the four packages into the DSH `web` profile, once:

```bash
dsh plugin --profile web add <clone>/organon/agent/plugins/worker
dsh plugin --profile web add <clone>/organon/agent/plugins/organon-preset
dsh plugin --profile web add <clone>/organon/agent/plugins/loop
dsh plugin --profile web add <clone>/organon/agent/plugins/memory
```

The memory package has no bundle of its own (the Organon preset mounts it), so DSH warns that it is installed as a plain dependency; that is expected. No environment variable or fixed path is needed: every plugin finds its folders from its own location. The packages are linked, so code changes take effect the next time DSH starts.

## Start a run

1. Start DSH: `dsh web`.
2. In the browser, open a new session **in the task folder**, for example `tasks/kernel_builder`, and choose **Organon mode**.
3. Give the budget, for example: `Run this task with a budget of 30 candidates.`

The agent creates the run inside the task folder, in `.organon/runs/<YYYY-MM-DD>_<NN>/` (adding `.organon/` to the task folder's `.gitignore` when the task is in a git repository). The task's own files are never edited: `c000000` is a copy of the task folder, and every candidate is a copy of its parent with the worker's changes. At the end it reports the best candidate's folder and `summary.md`.

## ALE-Bench final score

During the search, ALE-Bench scores come from the public test cases. When the run is finished, score its best candidate on the hidden test cases:

```bash
python final_eval.py tasks/ale_bench/ahc008/.organon/runs/<run>
```

It prints the result and saves it to `final.txt` in the run folder. For the other tasks, the score recorded during the run is the final score.

## Kernel Builder task

`tasks/kernel_builder` adapts CORAL's full VLIW SIMD kernel workload. Its evaluator
needs only Python 3.11+ and uses eight randomized checks per candidate. Fitness is
`147734 / cycles` for correct kernels and zero for failures. The supplied seed
measures 11,910 cycles; 147,734 is the historical scalar reference. See
[tasks/kernel_builder/SOURCE.md](tasks/kernel_builder/SOURCE.md) for the pinned
source, simulator details and validation commands.
