---
name: dev-skill-harvest
description: Turn a repeated procedure into a skill, and gate the promotion. Read when a procedure runs twice, or when a skill copy goes stale against its source.
---

# Skill Harvest

## Trigger

Create a draft when one of these holds:

- The same procedure ran twice in one session.
- One executed proof shows a rule worth keeping.
- A skill copy was found stale against its canonical source.

Do not create a draft for a single occurrence. Two is a coincidence. Three is a pattern.

## Gate before promotion

All five must hold.

1. The name collides with no skill in any discovery root.
2. A skill checker reports no error for the file.
3. The body names its evidence: what showed the need, with the command or the case.
4. A draft that restates a house rule was re-checked against the canonical source, and the `## Provenance` heading names that source.
5. The human approves.

Promotion is removing the draft flag and committing. That commit is the rollback point.

## Cap

The catalog is a menu that is paid for on every request. Promote rarely. A skill that does not earn its line costs every future turn.

Install only the skills the team uses. One combined skill usually beats four narrow ones.

## Layout

One skill is one directory with one `SKILL.md` file.

- `name` is lowercase kebab-case and matches the directory name.
- `description` states when to load the skill, in one sentence.
- Supporting pages live beside `SKILL.md` and are read on demand.

## Verify the install

1. Write the file.
2. Load the skill with the exact `name` value.
3. Compare the returned body with the file.
4. Run the sync script, then run `diff -r .agents/skills .claude/skills`. The diff must print nothing.

A malformed file never fails the session. The runtime logs a warning and ignores the skill. Load `dev-known-gotchas` when a skill does not load.

## Do not

- Do not promote without the gate.
- Do not restate a house rule from memory. Read the source.
- Do not edit `.claude/skills` by hand. Fix the canonical copy in `.agents/skills`, then run `scripts/sync-skills.sh` or `scripts/sync-skills.ps1`.
- Do not promote more than one skill from one session's evidence.
