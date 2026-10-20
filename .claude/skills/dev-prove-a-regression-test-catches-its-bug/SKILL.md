---
name: dev-prove-a-regression-test-catches-its-bug
description: Use after writing a regression test, to prove the test fails on the old behavior.
---

# Prove a Regression Test Catches Its Bug

1. Write the fix and the regression test. Run the test. It must pass.
2. Undo the fix only, and keep the test. For a one-line guard, replace the guarded line with the old unconditional line.
3. Run the one test by name. Expect a failure with the assertion message you wrote.
4. When the test still passes, the test does not cover the bug. Rewrite the test.
5. Restore the fix exactly. Run the named test again. It must pass.

## Why the order matters

A test that passes in both states measures neither state. It passes for a reason unrelated to the fix, and it will keep passing after the bug returns.

## Notes

- Run the single test by name. A whole-suite run hides which test failed.
- Restore the fix by hand, not from a stash. A stash can carry an unrelated change.
- Record the two commands and their two results. Load `dev-verification-before-completion`.
- When the bug needs a fixture, confirm the fixture exists on the original revision too.
- When the old behavior cannot be restored, say so. An unproven guard is unverified.
