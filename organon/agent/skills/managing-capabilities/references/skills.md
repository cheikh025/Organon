# Skills

## When

- A procedure you will follow more than once, in this run or later ones, and following it from memory costs time or mistakes.
- A lesson turned out to be a procedure: "when X, do these steps".
- A procedure is too long or too detailed for a memory item.

A one-line fact belongs in memory, not in a skill.

## How

A skill is a folder `agent/skills/<name>/`:
- **`SKILL.md`** starts with YAML front matter: `name` (lowercase letters, digits and hyphens, the same as the folder) and `description`. The description is the trigger: say **when** to use the skill, in the words you would think of at that moment, because the description is all you see before loading it.
- The body stays short: what the skill is for, the steps or decisions at a glance, and which file to read for detail. Explain why important boundaries exist, and use concrete examples to show choices rather than imply one required method.
- Details go into `references/`, reusable text into `templates/`, runnable helpers into `scripts/`.

DSH watches `agent/skills/`, so a new or edited skill is available at once; there is nothing to install.

For the writing itself (minimal context first, critical constraints visible, bounded outputs, each fact once), follow the `agent-experience` skill.

## Change and remove

- **Change** a skill when a run shows a step is wrong, missing or unclear; keep the change small.
- **Remove** a skill at task end when it proved unhelpful or another skill replaced it.
- Record the change in the run's history entry.
- The copies of DSH's own skills (`cordis-plugin-development`, `editing-cordis-compositions`, `cordis-composition-reference`, `agent-experience`) can be changed like any other; when DSH is upgraded, compare them with DSH's new versions.
