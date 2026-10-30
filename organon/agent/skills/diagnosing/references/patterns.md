# Patterns seen before

Patterns with a known shape: the signal, what to check, causes that often lie behind it, the owners to consider, and the fixes tried with their verdicts. They are starting points for a diagnosis, not answers: check the evidence in your run before you use one. The diagnosis procedure is in `SKILL.md`; consult this file when a signal looks familiar.

The first entries are seeds. New ones come from your runs: a pattern → cause → fix whose ledger line earned `helped` becomes a process lesson, and once it is supported across runs it is added here (the `memory` skill). Update an entry's "Tried" line from your ledgers, `helped` and failed fixes alike.

## Stall with low diversity

- **Signal:** no new best beyond the gain floor; alive scores close together; reports describing the same change; one parent with many children.
- **Check:** do the alive candidates differ in what they do (per-case results, reports, programs), or only in score?
- **Causes:** selection keeps picking the same parents; Surv keeps near-copies; every worker gets the same context and goes the same way.
- **Owners:** Sel (`pressure`), Surv (`k`, or one that keeps variety), Var (some attempts from other parents or from nothing), the preset (a different direction).
- **Tried:** none yet.

## Stall with good diversity

- **Signal:** no new best beyond the gain floor, but the alive candidates differ.
- **Check:** how far the search is into its budget, and how often gains came so far.
- **Causes:** gains near the top are rarer; the search may only need longer.
- **Owners:** often none: keep going a little longer before changing.
- **Tried:** none yet.

## Recurring failures

- **Signal:** many broken candidates in the summary.
- **Check:** the logs of a few broken candidates, and whether they fail the same way.
- **Causes:** a time limit, a format the evaluator rejects, code that does not compile, a fault inherited from a parent.
- **Owners:** Var (pass the failure more clearly), a repair preset routed after errors by a Loop, an Eval step that checks quickly before the full evaluator.
- **Tried:** none yet.

## The same error again and again

- **Signal:** one error text in the logs of candidates from different workers.
- **Check:** the transcripts of two of them: did the workers read the parent's feedback, and did they run anything that would have shown the error?
- **Causes:** the feedback does not reach the workers, or does not say enough; the workers cannot test locally.
- **Owners:** Var (what feedback is staged, and how), the preset (test before finishing), the preset's tools.
- **Tried:** none yet.

## Separate branches improved different parts

- **Signal:** different lineages gained on different cases or parts of the task.
- **Check:** the per-case results of the lineages' best candidates.
- **Causes:** each branch holds part of what works.
- **Owners:** Sel (pick two parents), Var (give the worker both, or what sibling children tried), a recombination preset.
- **Tried:** none yet.

## One lineage dominates

- **Signal:** most alive candidates descend from one early candidate.
- **Check:** whether other lineages were given parents at all, and how they did.
- **Causes:** selection pressure; Surv keeps only the top family.
- **Owners:** Sel (`pressure`), Surv (one that keeps variety).
- **Tried:** none yet.

## Little budget left

- **Signal:** the budget nearly used.
- **Check:** which strategies, presets and parents paid off in this run, by their verdicts.
- **Causes:** not a fault: the trade-off moves from learning to using what you learned.
- **Owners:** Sel and the preset: favour what paid off.
- **Tried:** none yet.

## Attempts end before testing

- **Signal:** candidates whose final edit was never run; many evaluations close to the parent's.
- **Check:** the transcripts' summaries: where did the minutes go, and was there a run of the program near the end?
- **Causes:** a slow full evaluation run after every edit; long builds; exploring before changing anything.
- **Owners:** Var (stage a quick check), the preset (test on a few inputs first).
- **Tried:** none yet.

## Siblings repeat each other

- **Signal:** several children of one parent report the same change and score alike.
- **Check:** their reports and diffs; whether they ran at the same time.
- **Causes:** concurrent workers from one parent get the same context and know nothing of each other.
- **Owners:** Var (stage finished siblings' reports), Sel (limit attempts in flight per parent, from `core.pending()`).
- **Tried:** none yet.

## A fix that never reached the workers

- **Signal:** a change whose verdict is `no effect`, while the cause still shows in the evidence.
- **Check:** the transcripts after the change: did the workers open the staged file, follow the new line in the persona, call the new tool?
- **Causes:** the fix sits where workers do not look; it is phrased as optional advice; it arrives too late in the worker's session.
- **Owners:** Var (where and how the fix is staged and announced), the worker plugin (a mechanism instead of advice).
- **Tried:** none yet.
