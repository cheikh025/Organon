# Working with insights

The rules for what an insight is and what it must carry are in the memory skill ("Insights: memory for workers") and the template in `formats.md`. This file is about doing it well: when an insight is worth writing, how to keep insights findable, how to choose what to deliver and when, and how to tell whether it was used and helped. Every decision here is yours to improve; what you learn about it goes into learning lessons like any other change to yourself.

## 1. When to write one

- **When a contrast backs a finding about an approach.** Candidates that differed in approach and in result, with their reports, evaluations and, where it matters, transcripts as sources. A diagnosis often turns one up (the `diagnosing` skill); write the insight then, during the run, not only at its end.
- **A failure is worth one too,** when the evidence shows what failed and under which conditions. An insight that an approach failed in one setting says nothing about other settings; its `situation` says which.
- **One candidate is not a finding.** Without a contrast, keep it in `scratch/decisions.md` until one appears.
- **Your own idea is not a finding.** An approach no worker has tried is not an insight, however promising.

## 2. How to organise them

- **`situation`** says the conditions in terms a later task can recognise: the task's requirements, input sizes, time limits, what the evaluator rewards. This is what a later search matches against.
- **`scope`** says where it was observed: the task or the benchmark.
- **`related:`** lists insights that refine, extend or contradict it. When you write one, update the two or three closest.
- **Merge, split, retire** under the audit rules in the memory skill: two insights saying the same thing become one with both sources; one that covers two situations becomes two.

The test of good organisation is retrieval: when a later diagnosis or chunk needs an insight, you find it. If you find one only by chance, or after the moment it would have helped, change how they are organised.

## 3. Finding and delivering them

- **Start from the situation, not the collection.** Before a chunk, ask which insights fit the parents being worked on and the problems the diagnosis found, then look for those. Delivering everything anchors every worker the same way.
- **Choose the form and the moment.** The form: a file staged in the folder, with its sources and limits, or a line in the first message. The moment: from the start, only after a stall, only for some lineages. Var supplies them; which Var, and how it chooses, is yours to build (`managing-capabilities/references/strategies.md`).
- **Delivering an insight is a change to the search.** Give it a ledger line with what you expect (`running-a-task/references/diagnose.md`). Where you can, give it to some attempts and not to others from the same parents, so its effect can be judged.
- **Independence holds.** An insight is evidence the worker may use, adapt or reject; never an assignment (`running-a-task/references/delegate.md`).

## 4. Learning from use

Fill the `transfer` counters from evidence, not from what you hoped:

| Counter | Counted from |
|---|---|
| `passed` | the rows' `insights` tag |
| `adopted` | the transcripts: did the worker open the insight, and does its work use the approach? (`diagnosing/scripts/transcript.mjs`) A report saying so is a claim; the transcript shows it |
| `helped` | a comparison only: the ledger verdict of its delivery, never the worker's say-so |

What the counts tell you:

- **passed often, never adopted:** it is hard to find in the folder, badly phrased, or does not fit what the workers faced. Change where or how it is given.
- **adopted, never helpful:** its `situation` is too broad. Narrow it to where it helped, or retire it.
- **helped:** deliver it in that situation again, and note in its `situation` where it held.

At the end of a run, also ask what was missed: a worker that repeated a failure an insight already covered means delivery failed; a recurring finding with no insight means writing failed; an insight that existed but was not found means organisation failed. Each has a different fix, in this file's sections 1 to 3.
