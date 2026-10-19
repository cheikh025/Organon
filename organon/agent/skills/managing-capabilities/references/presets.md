# Worker presets

A worker preset gives a fresh worker a **purpose and a way of working**. The agent can create, select, and revise presets as it learns which kinds of work are useful for the task. A preset may describe a broad search style, a narrow specialty, an exact experimental procedure, or a supporting investigation.

**The important question is what the worker is meant to contribute.** A persona is not required to follow a fixed sequence such as *edit → verify → report*. Its instructions can be short or detailed, permissive or strict. Verification, output format, number of experiments, and specific techniques are choices the agent can make for that worker—not universal persona requirements.

## 1. Two purposes: solution workers and support workers

These purposes should not be confused.

| | Solution worker | Support worker |
|---|---|---|
| **Purpose** | Produce another candidate solution for the search. | Help the agent understand the task or choose what to do next. |
| **Typical work** | Refine, redesign, combine, repair, or independently construct a solution. | Diagnose a failure, compare ideas, inspect bottlenecks, or analyze results. |
| **Contribution** | A **meaningfully modified or newly constructed candidate**, including one that fails or scores worse. | Useful information, evidence, a diagnosis, a proposed direction, or another requested support result. |
| **Code modification** | Expected: the worker is being used to generate a candidate. | Optional; the assignment may need no edits at all. |
| **Final message** | Whatever is useful: observations, next steps, a detailed report, or simply `done`. The candidate itself is the primary output. | Whatever serves the assignment; it can also be very short. |

### Solution workers should move the search forward

A solution worker should **attempt a real change and produce a distinct candidate**, rather than return an unchanged parent because its changes failed to improve the score.

- An unsuccessful candidate can reveal which ideas do not work, where an assumption fails, or which direction is worth investigating next.
- A candidate that is worse, incorrect, or fails evaluation can still yield useful evidence. The evaluator, diagnostics, and subsequent analysis can make that attempt informative.
- **Do not make “return the original if nothing improves” the default outcome.** It consumes a candidate attempt while often producing a duplicate with little new information.
- A worker may revert *individual experiments* during its process. That does not require its final candidate to be the original parent. It can preserve or reconstruct the most informative distinct variation even if its measured score is worse.

This is about the **goal of candidate generation**, not a mandate to use a particular procedure. The agent may instruct a worker to test exactly three hypotheses, verify every edit, prohibit certain changes, or explore without running tests. All can be legitimate methods for producing candidates.

There is a difference between a **failed new attempt** and **no new attempt**. Do not confuse “the worker did not improve the score” with “the worker failed to contribute to search.”

### Support workers have a different success condition

A support worker may be asked only to diagnose why a kernel fails, compare candidate designs, inspect logs, or examine an idea. Its work is useful if it supplies the intended insight; it does not have to produce a candidate. Avoid judging support workers by whether they modify files.

If the same investigative persona is used as part of *candidate generation*, give it an actual candidate-producing assignment. If it is invoked for *support*, an analysis-only outcome is entirely appropriate.

## 2. What a preset controls—and what the worker receives

A usable worker involves two complementary parts:

- **Preset:** The worker's persona and available tools. The persona establishes its purpose, working style, scope, and any instructions the agent considers useful.
- **Invocation context:** The task, parents, files, feedback, and other evidence supplied for this particular attempt. In the described search setup, **Sel** chooses parents, **Var** stages inputs and describes the workspace, and **Loop** may decide which preset to use for an attempt.

The two parts must fit. A crossover worker needs access to the parents it is supposed to combine; a repair worker needs the failed candidate and, when available, failure evidence. A fresh-solution worker may require only the task and starting files. Support workers need whichever inputs their investigation depends on.

The persona should not assume missing tools, parents, or files. For reusable presets, let Var provide changing paths, candidate identities, and current results. A deliberately one-off preset may contain concrete attempt details when they are appropriate and actually available.

## 3. Designing a persona

**Start with the purpose.** Ask what distinct work this worker is supposed to perform and why it would be useful. Then choose how much direction to give.

The agent can specify any combination of:

- **Search behavior:** cautious local changes, radical redesign, crossover, systematic experimentation, targeted repair, independent construction.
- **Specialization:** one subsystem, a performance bottleneck, a class of algorithms, a representation, a failure mode, or an interesting hypothesis.
- **Method:** exactly three trials, one large rewrite, bounded changes, controlled comparisons, staged experimentation, or an open-ended investigation.
- **Constraints:** preserve a feature, avoid a known failure mode, work within a resource limit, or restrict which parts of the solution may change.
- **Evidence:** testing, evaluation, profiling, mathematical reasoning, or no mandatory checks when they are not central to the assignment.
- **Output:** a modified candidate, a diagnosis, a short reply, a structured report, proposed next steps, or no prescribed response format.

**None of these is mandatory for every persona.** A strict preset is not inherently worse than an open-ended one. Its value depends on whether the chosen behavior helps achieve its purpose.

### Do not confuse methodology with a preselected answer

A persona can legitimately direct the worker to *investigate simulated annealing*, *test memory-layout alternatives*, or *perform exactly three measured edits*. These define a direction or method.

What deserves scrutiny is a supposedly **general, reusable search preset** that dictates the same finished implementation for every parent, without giving the worker a meaningful problem to solve or a hypothesis to investigate. Such a preset may merely reproduce the agent's prewritten solution across attempts. That exact recipe could still be valid as a **deliberate one-off experiment**. The issue is the **fit between purpose, scope, and repetition**, not specificity itself.

## 4. General solution-worker personas

These are examples of possible behaviors, **not a fixed set of roles** that the agent must use.

### `refine` — targeted improvement

**Expected input:** One existing candidate, with whatever feedback is available.

```yaml
prefix: >-
  Improve the supplied solution while retaining its main approach.
  Look for a concrete weakness and make a targeted change to address it.
  Produce a modified candidate, even when the change does not improve
  the measured result. Use what you discover to guide the attempt.
```

It defines a narrow search behavior without choosing the edit in advance. It does **not** discard every unsuccessful idea and return a duplicate of the parent.

### `explore` — a different solution

**Expected input:** The task; optionally a parent as reference.

```yaml
prefix: >-
  Develop a substantially different way to solve this task.
  Challenge the existing algorithm, representation, or strategy.
  Build a candidate that embodies your alternative approach,
  even if it initially performs worse than the reference.
```

This role is meant to change the *approach*, not simply tune the existing one.

### `crossover` — combine parents

**Expected input:** Two parents supplied by compatible Sel and Var strategies.

```yaml
prefix: >-
  Study both supplied solutions and find ideas that could work together.
  Build a new candidate that integrates useful elements from them.
  If the obvious combination fails, investigate a different integration
  rather than returning either parent unchanged.
```

A combination need not beat both parents to be a useful experimental candidate.

### `repair` — recover from failure

**Expected input:** A failed candidate and relevant failure evidence.

```yaml
prefix: >-
  Investigate the failure in the supplied candidate and produce a
  modified version that attempts to address its cause. Keep the repair
  focused unless the failure calls for a deeper change.
```

This is candidate-producing repair. An investigation that *only explains* the error is a support task instead.

### `fresh` — independent construction

**Expected input:** The task and required starting files; no parent required.

```yaml
prefix: >-
  Build a solution to this task using an approach of your own.
  Develop a concrete candidate rather than imitating an existing one.
```

### `measured-experiments` — deliberately strict procedure

**Expected input:** An existing candidate and access to the required evaluator.

```yaml
prefix: >-
  Try exactly three targeted modifications, evaluating each against
  the starting candidate. You may undo unsuccessful changes while
  experimenting. Submit the strongest distinct variant you developed,
  including if all three are worse than the starting candidate.
  Finish with exactly ten lines describing what you tested.
```

The restrictions are **intentional working methodology**. Exact experiment counts, mandatory verification, and a fixed response length are entirely acceptable when the agent wants them. The final candidate remains distinct because this preset is being used for candidate generation.

## 5. Three task-specific solution workers

The task details are illustrative. Each worker targets a problem, but still has something meaningful to discover and implement.

### Example A — Route optimization: `congestion-redesign`

**Purpose:** Generate candidates that perform better in crowded regions of a route-planning task. **Input:** A working planner and relevant task context.

```yaml
prefix: >-
  Improve the planner's behavior in congested regions, where local
  decisions can create later delays. Investigate the source of those
  delays and change the planner to address it. You may revise its
  lookahead, route scoring, state representation, or decision logic.
  Produce a new candidate based on your investigation.
```

The persona defines **what problem to attack**, without dictating the precise algorithm or data structure.

### Example B — GPU LayerNorm: `memory-traffic-optimizer`

**Purpose:** Generate kernels that explore memory-access improvements. **Input:** A kernel, its correctness requirements, and optionally profiling data.

```yaml
prefix: >-
  Create a LayerNorm kernel variant aimed at reducing unnecessary
  memory traffic. Explore how reads, writes, intermediate storage,
  or fusion affect the implementation. Change the kernel in the
  direction you judge most promising. Keep the result as a distinct
  candidate even when the performance effect is negative.
```

This is a **solution worker**, unlike a support-only bottleneck investigator. It is not required to follow a universal benchmark-and-report sequence; its purpose is to build a kernel variant.

### Example C — Mathematical construction: `structure-guided-construction`

**Purpose:** Produce a new candidate for a low-autocorrelation binary-sequence problem. **Input:** The task and, optionally, prior constructions or feedback.

```yaml
prefix: >-
  Search for structural regularities in strong binary sequences and
  turn one of your hypotheses into a new construction. You may use
  symmetries, block arrangements, transformations, or another idea.
  Produce a concrete candidate sequence, even if the hypothesis
  fails to improve the current best value.
```

Here the agent asks for a **candidate construction**, not merely an interesting conjecture.

## 6. Support-worker example

### `failure-analyst` — understanding an unsuccessful attempt

**Expected input:** A failed candidate, logs, and other relevant context.

```yaml
prefix: >-
  Determine why this candidate failed and identify the main issue
  the agent should consider. Focus on the most useful evidence.
```

This worker need not modify code, run an evaluator, or produce a formal report. A short diagnosis, a suggested next step, or simply `done` may be suitable depending on the specific support assignment. **Do not use this analysis-only role as a substitute for a solution worker when the search expects a new candidate.**

## 7. Bad examples—and the actual failure in each

These are **purpose mismatches and avoidable failure modes**, not a list of forbidden instructions. A technique, a strict protocol, or a short final message is not automatically bad.

### 1. A `refine` worker discards all unsuccessful candidates

**Bad for candidate generation:**

```yaml
prefix: >-
  Make small improvements. Keep only changes that increase the score.
  If none improves the result, revert everything and submit the
  original program unchanged.
```

**Why it fails:** The preset turns unsuccessful experiments into a duplicate candidate. The search loses the chance to evaluate or inspect an alternative and spends an attempt on the same artifact.

**Better:** Ask for targeted changes and a **distinct final candidate**. The worker can compare alternatives or undo intermediate edits, but should not systematically substitute the original parent for its attempted solution.

### 2. A `crossover` worker returns a parent instead of a child

**Bad for candidate generation:**

```yaml
prefix: >-
  Combine the two parents. If the combination does not beat both,
  copy the better parent unchanged into the output folder.
```

**Why it fails:** If the attempt underperforms, the output is merely a known parent. The failed combination itself might have revealed useful interactions and deserves to remain a candidate or an analyzable experimental result.

**Better:** Produce and submit an actual combination or other meaningful derivative. It may lose to both parents; that is still a new result.

### 3. The worker solves the task in the persona before starting

**Bad as a recurring, general route-optimization role:**

```yaml
prefix: >-
  For every parent, replace adjacency lists with CSR, cache exactly
  three depots per node, and replace the priority queue with a radix
  heap. Make no other changes.
```

**Why it fails:** The worker is repeatedly executing one predetermined implementation recipe, whether or not it fits the parent. There is little room to discover distinct improvements, and repeated invocations can become redundant.

**Better for a reusable specialist:**

```yaml
prefix: >-
  Improve the route planner's graph representation and memory access.
  Investigate alternative layouts and implement a promising variant.
```

**Important:** The exact CSR/radix-heap recipe may still be a good **single targeted experiment**. Do not ban specific techniques or detailed procedures. Avoid mistaking one recipe for an adaptive, reusable search capability.

### 4. A solution attempt is assigned analysis-only work

**Bad when invoked as a candidate-generation attempt:**

```yaml
prefix: >-
  Inspect the kernel and explain why it is slow. Recommend possible
  changes, but do not modify the candidate.
```

**Why it fails:** This can be an excellent **support** persona, but it cannot fulfill an invocation whose purpose is to produce another candidate.

**Better:** Run it as support; or, for candidate generation, ask the worker to implement one of the insights in a new kernel variant.

### 5. The inputs do not match the role

**Bad setup:** A `crossover` persona expects two parents, but the active Sel chooses only one and Var stages only one.

```js
// In this setup, Sel still supplies one parent.
evolve_use({ preset: "crossover" })
```

**Why it fails:** The worker cannot perform the intended comparison or combination with the inputs it has.

**Better:** Supply two parents through compatible Sel and Var behavior, or use a role that needs only one. A valid persona does not compensate for missing invocation inputs.

### 6. Temporary run details become permanent persona instructions

**Bad for reuse across attempts:**

```yaml
prefix: >-
  Candidate c000041 scored 1252 and c000046 crashed. Always copy
  c000041's approach and avoid the strategy in c000046.
```

**Why it fails:** The evidence may be stale or context-specific. One failed implementation is not proof that its whole approach should never be revisited.

**Better:** Supply current feedback and relevant history in the invocation context, and let the worker reason about which lessons transfer. A deliberately one-off persona can still mention exact candidates.

### 7. A reusable persona assumes a particular folder layout

**Bad for reuse with varying Var strategies:**

```yaml
prefix: >-
  Read the first parent in ./main.cpp and the second in
  ./parent_2/main.cpp. The second parent's feedback is always in
  ./parent_2/feedback.txt.
```

**Why it fails:** The same worker behavior breaks when the task language or staged filenames change.

**Better:** Specify *the relationship between the inputs* in the persona, and let Var describe their actual paths for this attempt. Hard-coded paths are fine when a specific fixed workspace is intentional.

### 8. The persona contradicts itself

**Bad:**

```yaml
prefix: >-
  Invent a fundamentally different algorithm. Preserve the current
  algorithm exactly and do not change its representation or decisions.
```

**Why it fails:** The worker cannot simultaneously satisfy both objectives as written.

**Better:** Choose the intended tradeoff: structural exploration or constrained optimization. A deliberate multi-stage procedure is fine if the stages and priorities are coherent.

## 8. Tools, records, and reusable context

- **Tools:** A preset selects the tools its work needs. Solution workers generally need to inspect and modify the candidate; support workers may need only reading and analysis tools. The described worker setup restricts host-changing and delegation tools, so do not write personas that depend on inaccessible capabilities.
- **Attempt context:** Sel, Var, and Loop determine which candidates, files, feedback, and instructions reach a worker. Keep reusable behavior separate from data that changes every attempt when practical.
- **Reports:** The original setup describes a worker's final message being saved as `report.md` and available to descendants as `parent_report.md`. This is a **recording convention of that setup**, not a requirement that each persona produce a formal report. A final response may contain next steps, findings, or simply `done`; the agent can use evaluator results, candidate differences, or other records to learn from the attempt.
- **Instruction inheritance:** Include `agent-instructions` or skills only when intended. In the described setup, omitting the `agent-instructions` row prevents that source of `AGENTS.md` instructions from being installed in the worker preset.

## 9. Creating a preset in the described DSH setup

DeepSeek Harness uses `@deepseek-ai/dsh-agent-preset` rows within Cordis patch compositions. The original project guide places custom worker bundles under `agent/plugins/<bundle>/`; that is a **project layout choice**, not a universal DSH requirement.

A bundle's `package.json` declares its patch in the `dsh.bundle.patch` manifest field. The patch contains preset entries. The following is an **illustrative entry**, to adapt to the active profile and available plugins:

```yaml
- insert:
    - id: preset-explore
      name: '@deepseek-ai/dsh-agent-preset'
      config:
        id: explore
        name: Explore (worker)
        description: Produces candidate solutions with different approaches.
        order: 101
        plugins:
          - id: persona
            name: '@deepseek-ai/dsh-persona'
            config:
              prefix: >-
                Build a substantially different solution for the task.
                Produce a new candidate, even if it performs worse.
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

The exact tool list is not a required template. Customize it to the role and the worker environment.

In the original setup, worker presets are separated from session modes with names such as `"Explore (worker)"` and an `order` of 100 or more; these are **local conventions**. The guide describes `plugin_manager` actions such as `install_bundle` and `set_bundle`. Reload behavior depends on the active DSH profile and whether hot reload is enabled; some setups require a restart. Check that the composition is actually active rather than assuming the new persona is loaded.

## 10. Use, learn, revise

- **Use:** Select a preset with `evolve_use({ preset: "explore" })` when the active Sel and Var meet its input needs. A Loop or Sel strategy may select `a.preset` per attempt. A support role may be invoked separately through `spawn_worker`.
- **Learn:** Judge solution workers by the **candidates and evidence they generate**, not solely by immediate score gains. Judge support workers by whether their outputs help the agent understand or decide. Inspect repeated patterns, including when two personas generate essentially the same candidates.
- **Revise:** Change the persona, tools, or input strategy when experience suggests a better design. Revisions generally affect workers launched afterward; distinguish versions when attributing results matters.
- **Keep or retire:** Reuse presets that provide useful, differentiated search behavior. Merge or remove ones whose outcomes are consistently redundant or unhelpful. There is no required number of roles or mandatory lifecycle.

**Design principle:** A preset is an **agent-designed capability**, not a fixed persona format. Give it a clear purpose, the inputs and tools it needs, and whatever freedom or discipline serves that purpose. For candidate-generating workers, preserve the value of experimentation by producing **new candidate attempts**, including unsuccessful ones. For support workers, the contribution may be knowledge instead of code.

---

### Reference notes

- **Project-specific behavior** (Sel, Var, Loop, `evolve_use`, `spawn_worker`, `report.md`, and worker restrictions) follows the supplied *Worker presets* guide. Verify those contracts against the current project implementation if it has changed.
- **DSH composition shape and bundle manifest:** [DeepSeek Harness preset example](https://github.com/deepseek-ai/deepseek-harness/blob/master/packages/bundle/web-app/presets/ptc.patch.yml) and [DSH app-boot documentation](https://github.com/deepseek-ai/deepseek-harness/blob/master/packages/boot/app-boot/README.md). These support the preset row, persona plugin, and bundle-patch conventions; they do not by themselves establish the project's custom `evolve_use` and `spawn_worker` interfaces.
