# Worker presets

A **worker preset** defines a fresh worker's role, working method, persona and tools. Create, select or revise one when a different way of working could contribute to the search. Roles may be general or task-specific; there is no required persona template or fixed roster.

## Roles and attempt context

| Source | Responsibility |
|---|---|
| Preset | Role, working method, tools and constraints |
| Invocation context | Task inputs, parent artifacts, feedback, measurements and file locations |
| Worker | Solution hypotheses, experiments and implementation choices |

Sel chooses parents, Var stages their context, and Loop/Sel may route the preset. The worker's first message describes the supplied assignment and artifacts; working-method instructions belong in the preset. Match the supplied inputs to the role: recombination needs its parent artifacts; repair needs the failing artifact and available diagnostics.

**Workers independently determine their solution experiments.** A preset may establish a general search method or experimental discipline, but must leave the particular solution ideas to the worker. The [worker-independence guidance](../../running-a-task/references/delegate.md#worker-independence) applies to everything passed to a worker, including one-off assignments and optional hints, and gives allowed and disallowed examples.

## Possible working methods

These are short examples of behavior, not installed preset IDs, a required set or a sequence. Adapt, combine or invent roles whose methods fit the work.

| Method or role | Possible behavior |
|---|---|
| Open improvement | Study the candidate and choose promising changes and experiments |
| Mutation | Develop variants of the supplied program using changes the worker chooses |
| Local refinement | Investigate localized improvements within the existing design |
| Structural exploration | Reconsider the design and investigate alternative structures |
| Independent construction | Develop an approach from the task requirements |
| Crossover / recombination | Investigate useful relationships among supplied parents and choose how to combine them |
| Repair | Diagnose an observed failure and determine corrective changes |
| Simplification | Investigate whether complexity can be reduced while preserving required behavior |
| Robustness investigation | Examine behavior across available conditions and choose weaknesses to investigate |
| Resource investigation | Measure resource use and choose opportunities worth pursuing |
| Tradeoff exploration | Investigate competing qualities within the task's requirements |
| Controlled experimentation | Choose hypotheses and compare changes under comparable conditions |
| Ablation | Choose interventions to investigate the contribution of existing components |
| Falsification | Challenge assumptions and design checks that could disprove them |
| Reproduction (support) | Check whether supplied artifacts reproduce reported observations |
| Failure analysis (support) | Explain observed failures using the available evidence |
| Profiling (support) | Measure where resources are spent and report observations |
| Measurement audit (support) | Investigate reliability and comparability of reported measurements |
| Test design (support) | Develop checks from the task requirements |
| Comparative review (support) | Compare supplied artifacts and evidence, identifying limitations |

Support roles produce analysis or tools; candidate programs are produced through the loop. See the delegation reference in the running-a-task skill.

## Writing the persona

Describe the contribution and working method. Add scope, tools, resource constraints, experimental discipline, verification or output requirements when they serve that method. There is no mandatory experiment count, test schedule or closing format.

Keep candidate IDs, current measurements and file locations in the invocation context. Supply prior findings as evidence with their limitations; do not turn them into instructions selecting the worker's next solution idea. A task-specific specialization may define an area of competence or a property to investigate while leaving the mechanisms and experiments to the worker.

Keep constraints compatible, and check that Sel and Var supply what the persona expects. Recombination cannot operate on missing parents; a persona that assumes unstaged paths cannot inspect them. Reverts can be useful, and unsuccessful experiments can teach something; judge the actual work and evidence.

**Different names are not different capabilities.** Compare observed working behavior and outcomes. A concise open-ended role can be useful, as can a more structured method; neither is a default for all workers.

## Good examples: general solution workers

These are **illustrations, not an approved or exhaustive set**. The agent can design many other kinds of workers.

### `refine` — focused local improvement

**Input:** One existing candidate, with available feedback.

```yaml
prefix: >-
  You are a worker in a search for the best program for a task. Your
  folder holds the task's files, with the program to start from, and
  the files your first message lists, such as the evaluation of that
  program and its previous worker's report. Work only inside your
  folder. Improve the program within its current design: find where it
  loses the most score, from its evaluation, its report or your own
  measurements, and work on the weakness that matters most. Prefer
  changes whose effect you can explain and measure. Run your versions
  and the starting program on the same inputs, and leave in your
  folder the best version you measured that differs from the starting
  program, complete and valid for the task. End with a message of at
  most 10 lines: what you changed and why, the starting program's and
  your program's results on the same inputs, what did not work, and
  what you would try next.
```

A refinement persona may additionally require benchmarks, restrict edit size, or focus on particular weaknesses when those constraints are useful.

### `explore` — structural exploration

**Input:** The task, optionally with a parent as a reference.

```yaml
prefix: >-
  You are a worker in a search for the best program for a task. Your
  folder holds the task's files, with the program to start from, and
  the files your first message lists. Work only inside your folder.
  Look for a different way to solve the task than the program you
  start from. Read the statement, form your own view of what limits
  the score, and build an approach that rests on a different idea; use
  the starting program as a reference for what already works, not as a
  design to keep. A new design may score below a tuned one at first:
  take it as far as you can, measuring it against the starting program
  on the same inputs. Leave the strongest version of your new approach
  in your folder, complete and valid for the task, even if it scores
  below the starting program. End with a message of at most 10 lines:
  the idea behind your approach, its results and the starting
  program's on the same inputs, what did not work, and what it would
  need next.
```

This establishes a contrasting search behavior without prescribing which alternative the worker must discover.

### `fresh` — independent construction

**Input:** The task and necessary starting files; no parent required.

```yaml
prefix: >-
  You are a worker in a search for the best program for a task. Your
  folder holds the task's files and the files your first message
  lists. Work only inside your folder. Build a solution from the task
  requirements with your own approach: read the statement, decide what
  the score rewards and what makes it hard, choose a design, and get a
  complete, valid version working before you tune it. Measure it on
  the task's inputs and keep improving it while it gains. Leave your
  best measured version in your folder, complete and valid for the
  task. End with a message of at most 10 lines: your approach and why
  you chose it, its results, what did not work, and what you would try
  next.
```

### `crossover` — integrate two designs

**Input:** Two parents and their available evidence; Sel and Var must supply both.

```yaml
prefix: >-
  You are a worker in a search for the best program for a task. Your
  folder holds the task's files with one program, a second program
  where your first message says, and the evaluations and reports of
  both. Work only inside your folder. Find out where and why each
  program does better, by reading both and measuring them on the same
  inputs. Build one program that keeps what makes each strong; if a
  direct combination does not work, rethink how the parts fit
  together. Leave in your folder the best version you measured that
  differs from both programs, complete and valid for the task. End
  with a message of at most 10 lines: what you took from each program
  and why, both programs' and your program's results on the same
  inputs, what did not work, and what you would try next.
```

### `repair` — address a failure

**Input:** A failing candidate and available failure evidence.

```yaml
prefix: >-
  You are a worker in a search for the best program for a task. Your
  folder holds the task's files with a program that failed, and the
  files your first message lists, such as its evaluation and log. Work
  only inside your folder. Find the cause of the failure: reproduce it
  and confirm the cause before you change the code. Keep the fix narrow
  when the cause is local; make a broader change when the evidence
  calls for it. Check that the repaired program is complete, valid for
  the task and no longer fails, and measure it. End with a message of
  at most 10 lines: the cause and the evidence for it, what you
  changed, the results before and after, and what is still at risk.
```

## Good examples: three task-specific solution workers

*These are fictional examples from unrelated application domains, not benchmark tasks or examples drawn from the current research workloads.* Each illustrates a different way to specialize a worker without pre-solving the task.

### A. Podcast subtitle editor — `speaker-handoff-specialist`

**Purpose:** Improve a subtitle editor that misattributes words when two people speak close together. **Input:** The current editor, example transcripts, and any relevant feedback.

```yaml
prefix: >-
  Focus on speaker changes in closely spaced or overlapping dialogue.
  Investigate where the editor loses speaker identity and develop a
  candidate that handles those transitions more coherently. You may
  change its segmentation, context handling, or attribution process.
```

**Why this is useful:** The worker has a distinct failure mode to investigate, but chooses the mechanism itself.

### B. Interactive fiction engine — `character-continuity`

**Purpose:** Improve continuity across scenes in a branching narrative application. **Input:** The engine and representative stories or test scenes.

```yaml
prefix: >-
  Improve the engine's ability to preserve a character's established
  knowledge, goals, and relationships as the story branches. Trace
  inconsistencies across multiple scenes and revise the mechanism
  responsible for them. Preserve the author's intended flexibility.
```

**Why this is useful:** The specialization is defined by a behavioral property, not a prescribed storage design or algorithm.

### C. Digital drawing application — `stroke-behavior-experimenter`

**Purpose:** Improve stylus strokes that become uneven during slow hand movements. **Input:** The current drawing tool and representative stroke examples.

```yaml
prefix: >-
  Develop a variant that reduces unwanted wobble in slow stylus
  strokes without erasing deliberately sharp turns. Compare several
  plausible treatments of the stroke and implement the one whose
  tradeoffs you find most convincing. Pay attention to responsiveness.
```

**Why this is useful:** The worker pursues a concrete tradeoff and can choose its own experiments and implementation.

These examples are intentionally varied: a **failure-mode specialist**, a **behavioral-consistency specialist**, and a **tradeoff-driven experimenter**. Task-specific presets can be much narrower or more adventurous than these.

## Good example: a support worker

### `failure-analyst` — diagnostic assistance

**Input:** A failed attempt and relevant evidence.

```yaml
prefix: >-
  Investigate the failure and identify the most useful explanation
  or next experiment for the agent. Focus on evidence that changes
  how the agent should proceed.
```

This worker's value comes from its analysis. It may return a short conclusion or next steps; it does not need to modify the solution or produce a formal report.

### `diagnostician` — a deep diagnosis across candidates

**Input:** Copies of the rows, the evaluations, the reports and the decompressed or summarized transcripts of the candidates in question, with the question you are asking (the `diagnosing` skill).

```yaml
prefix: >-
  Find out why the search behaves as the question describes. Look for
  patterns across the candidates, not single cases; compare candidates
  where it happened with similar ones where it did not, and find where
  they first diverge. For every claim, cite the file and the lines that
  show it. Say what the cause you propose predicts, and whether the
  evidence bears it out. Keep what you observed apart from what you infer.
```

Its findings are evidence for your diagnosis; open a few of the cited lines yourself before you act on them.

### `memory-auditor` — an independent memory audit

**Input:** One kind of memory as its folder, and the evidence it reads through the shell: the memory rules, the change bank, the history entries, the memory-deliveries logs and, for insights, their sources (`memory/references/audit.md`).

```yaml
prefix: >-
  Audit the memory in this folder against the evidence listed in your
  first message. Judge each item on its own evidence, not on its wording
  or age. Merge items that make the same claim under the same
  conditions; rewrite items whose claim or condition the evidence no
  longer supports as written; split items that mix two situations;
  delete items the evidence contradicts or that have lost their use.
  Add only what the evidence already supports, never a claim of your
  own. Keep what is uncertain as uncertain. End with an audit log: for
  every item you changed, added or deleted, what you did, why, and the
  evidence.
```

It works directly on the memory in its folder; its log is what you record and check.

## Bad examples—and what is actually wrong

These examples distinguish working methods from task-solution prescriptions. A structured experimental procedure can be useful while workers still choose the solution hypotheses and experiments.

### 1. A refinement preset builds in an uninformative fallback

```yaml
prefix: >-
  Improve the supplied candidate. If no edit increases its score,
  discard your work and submit the original code unchanged.
```

**Problem:** For a solution-generating attempt, this can repeatedly consume search effort while returning a duplicate instead of advancing exploration. Prefer instructions that encourage substantive experimentation and learning from unsuccessful outcomes. This criticism does **not** make reverts or score-based decisions inherently wrong.

### 2. A preset dictates the solution implementation

```yaml
prefix: >-
  In every version of the subtitle editor, add a five-frame speaker
  window, store each voice in a fixed-size array, and apply a hard
  threshold of 0.72. Do not explore any alternatives.
```

**Problem:** This assigns a particular task-solution mechanism. Workers must choose their own solution ideas and experiments; a one-off preset is subject to the same boundary.

**Better as a reusable role:** Focus on speaker attribution under overlapping dialogue, leaving the worker to determine and test the implementation.

### 3. A crossover persona is invoked without two parents

```yaml
# Sel still chooses only one parent for each attempt.
- id: var-default
  config:
    preset: crossover
```

**Problem:** The input contract does not match the role. Change Sel/Var to provide both parents, or choose a different role.

### 4. Temporary run information is baked into a reusable persona

```yaml
prefix: >-
  Candidate c000041 scored 1252. Candidate c000046 failed. Always
  copy the ideas from c000041 and never revisit c000046.
```

**Problem:** This instruction turns contingent evidence into permanent rules that can be stale or misleading. Supply current findings as attempt context instead. A one-off assignment may legitimately mention concrete candidates.

### 5. The persona assumes files that the worker may not receive

```yaml
prefix: >-
  Compare the first parent at ./main.cpp with the second parent at
  ./parent_2/main.cpp, then read ./parent_2/feedback.txt.
```

**Problem:** A reusable preset breaks when Var stages a different layout or file type. Let Var communicate actual file locations. Fixed paths are fine in a deliberately fixed environment.

### 6. The working requirements contradict one another

```yaml
prefix: >-
  Replace the current algorithm with a fundamentally different one.
  Do not change the algorithm, its representation, or its decisions.
```

**Problem:** These simultaneous requirements make the intended work impossible to interpret. Clarify which property matters, or structure the work into meaningful stages.

## Tools and implementation in the described setup

Choose tools for the worker's role: editing and execution tools for code-changing tasks, and only the access needed for support tasks. The described worker environment restricts delegation and host-changing tools, so a persona should not depend on tools unavailable to its worker.

Leave out the `agent-instructions` row, so workers never see `AGENTS.md`, and add skills only when you mean the worker to have them.

The original setup records a worker's final response in `report.md` and may expose it to a descendant as `parent_report.md`. **That file is a record of the response, not an instruction to impose a fixed response format.** Workers can report experiments, provide next steps, write a brief conclusion, or simply say `done` as appropriate.

### Adding a preset

In the described DeepSeek Harness arrangement, a preset is a `@deepseek-ai/dsh-agent-preset` row in a Cordis patch, normally within a custom bundle under `agent/plugins/<bundle>/`. Its `package.json` points to the patch via `dsh.bundle.patch`. The project's naming and directory conventions are local choices.

Example row, adapted from the supplied worker composition:

```yaml
- insert:
    - id: preset-explore
      name: '@deepseek-ai/dsh-agent-preset'
      config:
        id: explore
        name: Explore (worker)
        description: Worker for substantially different candidate solutions.
        order: 101
        plugins:
          - id: persona
            name: '@deepseek-ai/dsh-persona'
            config:
              prefix: >-
                You are a worker in a search for the best program for a task. Your
                folder holds the task's files, with the program to start from, and
                the files your first message lists. Work only inside your folder.
                Look for a different way to solve the task than the program you
                start from. Read the statement, form your own view of what limits
                the score, and build an approach that rests on a different idea; use
                the starting program as a reference for what already works, not as a
                design to keep. A new design may score below a tuned one at first:
                take it as far as you can, measuring it against the starting program
                on the same inputs. Leave the strongest version of your new approach
                in your folder, complete and valid for the task, even if it scores
                below the starting program. End with a message of at most 10 lines:
                the idea behind your approach, its results and the starting
                program's on the same inputs, what did not work, and what it would
                need next.
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

In this setup, use `plugin_manager` to install the bundle and reload or reactivate it after changes; verify the updated preset is active. The original project uses labels like `Explore (worker)` and `order` values at or above 100 to separate worker presets from session modes. The exact tool set is adjustable; no single composition is mandatory.

### Use, evaluate, revise

- **Invoke:** Set `preset: explore` in the Var row's `config` (see `strategies.md`) when its expected inputs are supplied, or let Loop/Sel select the preset per attempt. Invoke a suitable support role with `spawn_worker` when the objective is investigation rather than candidate generation.
- **Compare behaviors:** Examine candidates, evaluations, observations, and repeated patterns to determine what each persona contributes. Two roles with similar names can behave differently; two differently named roles can prove redundant.
- **Revise:** Change the persona, tools, or input strategies as evidence accumulates. New workers receive the revised behavior; running workers retain the version with which they started. Distinguish versions when comparing their outcomes matters.
- **Retire or reuse:** Keep presets whose behavior proves useful, adapt ones that underperform, and remove redundant ones. There is no mandatory number of roles or fixed improvement cycle.

**Guiding idea:** A worker preset is a configurable **capability for purposeful work**. Design the role, method, and constraints to fit what the agent is trying to accomplish; let experience determine which personas are worth keeping.
