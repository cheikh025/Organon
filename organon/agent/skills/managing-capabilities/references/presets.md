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
  Improve the existing solution through focused changes. Identify a
  weakness worth addressing, work within the main design, and develop
  a better variant. Choose the edits based on what you find rather
  than following a predetermined implementation recipe.
```

A refinement persona may additionally require benchmarks, restrict edit size, or focus on particular weaknesses when those constraints are useful.

### `explore` — structural exploration

**Input:** The task, optionally with a parent as a reference.

```yaml
prefix: >-
  Pursue a substantially different approach to this task. Question
  the existing structure and construct an alternative that rests on
  a different idea. Prioritize genuine variation over small tuning.
```

This establishes a contrasting search behavior without prescribing which alternative the worker must discover.

### `fresh` — independent construction

**Input:** The task and necessary starting files; no parent required.

```yaml
prefix: >-
  Develop a solution from the task requirements using your own
  approach. Explore the problem independently and implement the
  most promising design you find.
```

### `crossover` — integrate two designs

**Input:** Two parents and their available evidence; Sel and Var must supply both.

```yaml
prefix: >-
  Examine the two supplied solutions. Find complementary ideas,
  resolve conflicts between them, and construct a candidate that
  combines useful aspects of both. You may rethink the integration
  if a direct combination is ineffective.
```

### `repair` — address a failure

**Input:** A failing candidate and available failure evidence.

```yaml
prefix: >-
  Identify the likely cause of this candidate's failure and attempt
  a repair. Keep the intervention narrow when the cause is local;
  make a broader change when the evidence warrants it.
```

### `disciplined-exploration` — deliberately rigid experiments

**Input:** An existing solution and access to its evaluator.

```yaml
prefix: >-
  Discover a radically different approach. Always make exactly three
  edits, run the evaluator after each edit, revert all unsuccessful
  edits, and finish with exactly 10 lines of measurements.
```

This is **a valid preset**. Its exact rules are an intentional methodology. Requiring three edits, evaluating each, reverting unsuccessful edits, or fixing the closing format is not intrinsically a problem.

### `open-improvement` — minimal direction

**Input:** One candidate.

```yaml
prefix: >-
  Study the solution and improve it in whichever way you judge most
  promising. Challenge your assumptions and pursue your strongest idea.
```

A concise, open-ended persona can be just as intentional as a detailed one.

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
                Pursue a substantially different solution to the task.
                Explore a new design and implement your strongest idea.
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
