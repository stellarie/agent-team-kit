---
name: dev-standards
description: Apply the completion gate, the branch naming standard, and the reporting rules. Read before claiming a development task is complete, and before naming a branch.
---

# Development Standards

## Completion gate

After development work, complete every applicable gate before you claim success.

- Build every affected buildable target.
- Run the affected tests, including integration tests when they exist.
- Run the repository's documented CI-equivalent checks.
- Use a check that exercises the requested behavior. A green suite alone does not establish a new feature's correctness.
- For a bug fix, confirm the regression guard fails on the original behavior when practical.
- Perform a non-mutating merge-conflict check against the named target revision.
- Prefer repository scripts and checked-in workflow commands over invented commands.
- Review the final diff against every original requirement, touched edge, and scope boundary.
- Record every gate as passed, failed, skipped, or unavailable, with the command or the inspection and a reason.
- A failed required gate blocks completion, unless a documented baseline exception has supporting evidence.
  The failure must appear in the baseline recorded before work began.
- An unavailable gate stays unverified. Never report it as passed.
- Recheck after a repair or a final edit. A repair is another unverified change until someone checks it.

Run a destructive probe only in an authorized, isolated environment.

For documentation-only work, run the document checks and review the intended reader's workflow. Mark the code builds and the tests inapplicable.

## Merge conflict check

Run the check without touching the working tree:

```sh
git fetch origin
git merge-tree --write-tree HEAD origin/main
```

Exit code 0 means no conflict. The command prints the merged tree OID and writes no file.

When a branch revision is unavailable, report the conflict check as unavailable. Never infer a pass from an empty diff.

## Branch names

- Name new work branches `feat/<short-kebab-description>`, `bug/<short-kebab-description>`, or `hotfix/<short-kebab-description>`.
- Use `feat/` for features and planned improvements.
- Use `bug/` for ordinary defect fixes.
- Use `hotfix/` for urgent production fixes.
- Do not rename an existing branch unless the human asks.

## Report the gate

Report every line of the gate, including the lines that did not pass.

```text
Build:            not applicable, documentation-only change
Affected tests:   not applicable, no test target
CI-equivalent:    markdownlint-cli2, 0 issues in 18 files
Whitespace:       git diff --check, clean
Conflict check:   merge-tree exit 0 against origin/main
Manual checks:    none
Unverified:       rendering on the hosting site
```

## Report the outcome

State the outcome, the changed artifacts, the evidence, the remaining uncertainty, and the next required action.

Name the degree of completion, and never inflate it.

- Prototype: the approach worked once.
- Working: the acceptance criteria passed and the touched edges were handled.
- Robust: the adversarial cases and the recovery path were checked.
- Production: the robust evidence includes observability, documentation, and rollback.

A mislabeled prototype is the failure, not the prototype.

Load `dev-verification-before-completion` for the claim discipline around this gate.
