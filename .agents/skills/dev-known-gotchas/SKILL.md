---
name: dev-known-gotchas
description: Environment, runtime, and workflow traps that cost real time, with the fix for each. Read when a skill does not load, a command fails for no clear reason, a worker fails, or evidence disagrees with the tool.
---

# Known Gotchas

Every entry here cost real time at least once. Each entry names the symptom, the cause, and the fix.

Read this file when a result surprises you. Do not read it speculatively.

## Skill and instruction loading

### G01 A skill edit has no effect

- Symptom: You edit a skill file and the loaded body does not change.
- Cause 1: A second skill uses the same `name` in another discovery location. The runtime does not merge the copies. You may read the other copy.
- Cause 2: You edited `.claude/skills` but the canonical copy is `.agents/skills`. The next sync overwrites the edit.
- Cause 3: The runtime cached the skill list. Restart the session when the change still does not appear.
- Cause 4: A configuration entry disables the skill without deleting it.
- Fix: Find every copy of the `name`. Delete or rename the extra copies. Edit `.agents/skills`, then run the sync script. Check the configuration for a disable entry. Restart the runtime.
- Rule: Give every skill one directory and one unique name across every discovery location.

### G02 A skill file loads nothing

- Symptom: The skill loader does not list the skill, or the body comes back empty.
- Cause: Broken frontmatter, a wrong directory, or a wrong file name. Both Claude Code and Codex require a `SKILL.md` file inside the skill directory.
- Fix: Confirm the `SKILL.md` name and its directory. Confirm the `name` and the `description` keys. Match the `name` value to the directory name. Use the exact key spelling the runtime documents. Load the skill once after every write.
- Note: The failure is silent in at least one observed runtime. The file is ignored and only a warning is logged. Silent loss is the hazard, so verify the load.

### G03 An installed skill reverts to an older body

- Symptom: A reinstall reverts rules that someone changed on the installed copy.
- Cause: The installed copy drifted from the canonical source. One recorded deployment carried a skill file 25 days out of date. A reinstall from source would have reverted the live rules.
- Fix: Keep one canonical source. Generate the installed copy from it. Add a check that compares the two byte for byte.
- Here: `.agents/skills` is canonical. `scripts/sync-skills.sh` and `scripts/sync-skills.ps1` copy it to `.claude/skills`. Run `diff -r .agents/skills .claude/skills` to check.

### G04 A skill is installed at a location the runtime does not read

- Symptom: You install a skill at the location an older guide names, and the runtime never discovers it.
- Cause: Each runtime reads its own locations. Claude Code reads `.claude/skills` in a repository and `~/.claude/skills` for a user. Codex reads `.agents/skills` and `$HOME/.agents/skills`. The old Codex location `$CODEX_HOME/skills` is deprecated.
- Fix: Install repository skills in both `.agents/skills` and `.claude/skills`. Install user skills in both `~/.agents/skills` and `~/.claude/skills`.
- Evidence: The Codex skill loader marks `$CODEX_HOME/skills` "Deprecated user skills location, kept for backward compatibility".

### G05 Two files hold the same rule

- Symptom: Two instruction files disagree about one rule, and the later one wins by accident.
- Cause: A rule was copied instead of linked. One recorded audit found the completion gate and the branch names duplicated across two global instruction files.
- Fix: Give every rule one home. Link the second location. No automated check finds a duplicated rule, so search for the rule text before you add it.

## Shell and platform

### G06 A git revision path fails on Windows

- Symptom: `git show <branch>:<path>` in Git Bash on Windows returns "unknown revision", and the echoed argument shows backslashes and a semicolon.
- Cause: MSYS converts the colon inside the argument before git sees it.
- Fix: Disable the conversion for the command.

```sh
export MSYS2_ARG_CONV_EXCL='*'
git show "feat/branch:path/to/file"
```

- Related: `git ls-tree` needs `-r` to recurse. Without it, the command prints only the directory entry.
- Evidence: Executed on 2026-09-19. The command printed 639 numbered lines after the fix, and failed before it.

### G07 A confined runtime denies a command

- Symptom: A command that captures another program's output fails as the runtime denies the operation.
- Cause: Sandbox policy. The denial is a policy decision, not a bug in the command.
- Fix: Read the denial marker. Retry the exact command once with the narrowest wider permission, and give one sentence as the reason.
- Rule: When the human rejects the escalation, that decision is final for that command. Restructure the command instead of working around the denial.

## Evidence

### G08 A tool reports success and produces the wrong artifact

- Symptom: A capture tool returns a success status, and the artifact is a 160 by 28 pixel image.
- Cause: The status described the call, not the result.
- Fix: Read the artifact. A status is a claim about the attempt; the artifact is the outcome.

### G09 A failure produces no message

- Symptom: A subprocess error arrives empty, and you cannot name the cause.
- Cause: The caller captured standard error as bytes and discarded it.
- Fix: Confirm the diagnostic carries the cause, then re-run. An empty message is a missing observation, not a clean result.
- Rule: Do not guess a cause to fill a missing message.

### G10 An expected-output key disagrees with the artifact

- Symptom: Correct findings score as errors against a review answer key.
- Cause: The key under-counted the planted defects.
- Fix: Trust the artifact over the plan, and re-derive the key from the files.

### G11 A standards page returns no rules

- Symptom: A fetched standards page returns HTTP 200 with no rule text, or returns "This page requires JavaScript."
- Cause: The site renders its content with JavaScript, so the fetched HTML holds no rules.
- Fix: Use a fetchable primary source instead. Prefer a static specification page over a JavaScript application shell.
- Related: A fetch tool can truncate a long page inside its navigation block. Fetch the raw file when the page truncates.
- Evidence: Observed on 2026-09-20 on two standards sites. A static tips page from one of the two vendors returned the full text.

## Delegation

### G12 Delegation costs more than the task

- Symptom: A worker blocks, and the orchestrator finishes the work anyway.
- Cause: The assignment was too broad. A wide worker root caused a synchronous full-tree search, and the worker stopped.
- Fix: Bound the worker root to the target directory. Skip delegation when one file and one command would finish the task.

### G13 A worker cannot read a file outside its scope

- Symptom: A worker cannot open the task record it was told to update.
- Cause: The worker scope excluded the record directory.
- Fix: Put the record directory inside the worker scope, or have the orchestrator write the record from the worker's report.
- Rule: A worker write scope is advisory, not enforced. Compare every changed path against the declared scope after the run.

### G14 A worker failure reads as a verified result

- Symptom: An acceptance criterion is reported as reviewed, and no review report exists.
- Cause: The worker failed on a transient provider error. One recorded task produced two `fetch failed` errors and one HTTP 503, and no review report. The orchestrator completed the comparison locally.
- Fix: Allow one bounded retry. When the retry fails, either redo the work yourself or report the criterion as unverified.
- Rule: Never present a transient failure as a completed check.

### G15 A missing worker record reads as "no worker ran"

- Symptom: A later reader assumes no worker was used.
- Cause: A failed or discarded worker was left out of the record.
- Fix: Give a failed worker a full record block. State what actually happened.

## Budget

### G16 The token limit has a local-work escape

- Symptom: The workers exhaust the allowance, and the orchestrator continues locally without accounting for the same limit.
- Cause: The budget counted delegated calls only. Local reasoning and verification consume the same allowance.
- Fix: Count all work toward the limit. Reserve capacity for the final checks before dispatch. Checkpoint before a hard limit, and report the residual when the budget ends the task.
- Evidence: An early version of the guide allowed local completion when the next delegated call exceeded the limit. The guide now states that local continuation uses the same budget.

## Gate commands

### G17 Test a merge conflict without merging

- Symptom: The only known conflict check is a merge, which writes to the working tree.
- Cause: Habit. Newer git supplies a non-mutating check.
- Fix: Use the tree-writing form, which writes no file.

```sh
git fetch origin
git merge-tree --write-tree HEAD origin/main
```

- Exit code 0 means no conflict. The command prints the merged tree OID.
- Evidence: Verified on git 2.54.0 on 2026-09-21. Exit 0, one tree OID printed.

### G18 A documentation-only repository has no build gate

- Symptom: The completion gate cannot run, and the report goes out without a check.
- Cause: The gate assumes a build and a test target exist.
- Fix: Run the checks the repository does have, and name the ones that do not apply.

```sh
git diff --check
npx --yes markdownlint-cli2@0.23.2 <files>
```

- Also check for trailing whitespace, and confirm the fenced code blocks are balanced.
- Rule: An unavailable gate stays unverified. State the reason instead of claiming a pass.
