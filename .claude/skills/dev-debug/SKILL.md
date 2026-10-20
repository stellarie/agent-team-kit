---
name: dev-debug
description: Find the root cause of a failure before proposing any fix. Read on any bug, test failure, crash, or unexpected behavior, and especially after a fix that did not work.
---

# Debugging and Diagnosis

## The iron law

No fix without a root-cause investigation.

A fix whose cause is unknown destroys the evidence. When you cannot explain why the change works, you have a coincidence, not a repair.

## When to use it

Any technical failure: a test failure, a crash, wrong output, a build error, a performance problem, or a flaky result.

Use it most when the fix looks obvious, or when you already tried a fix.

## Phase 1 - Investigate

1. Read the whole error. Take the first error of a cascade, not the loudest. Note the file, the line, and the code.
2. Reproduce it. Are the steps exact? Does it fail every time? A reproducible failure is nearly understood. An unreproducible failure is a data-collection problem. Add observation instead of guessing.
3. Ask what changed. The recent change is the base-rate favorite. Check the commits, the dependencies, the configuration, and the environment.
4. Instrument the boundaries. Record what enters and leaves each part. Run once. The break sits between the last good boundary and the first bad one.
5. Trace the bad value backwards. Where did it originate? Keep going up until you reach the source.

Do not propose a fix until this phase ends with a stated cause.

## Phase 2 - Compare

1. Find working code that does something similar.
2. Read the reference implementation completely. Do not skim it.
3. List every difference between the working case and the broken case. Test a difference before you dismiss it.
4. Name the assumptions the failing code makes about its inputs and its environment.

## Phase 3 - Hypothesize and test

1. State one hypothesis: "X causes this, because Y."
2. Change one variable. Make the smallest change that tests the hypothesis.
3. Predict the expected observation before you run the experiment.
4. Observe the result. A failure means a new hypothesis, not a second fix stacked on an unverified first.
5. When you do not know, say so plainly, then gather more evidence.

## Phase 4 - Fix at the source

1. Write a test that fails on the current behavior. Load `dev-test-driven-development`.
2. Make one change that addresses the cause, not the symptom.
3. Verify the new test passes, the old tests still pass, and the reported symptom is gone.
4. Confirm the fix is executing. The commonest stall is editing one file while running another.
5. Prove the guard fails against the original behavior. Load `dev-prove-a-regression-test-catches-its-bug`.

## Three failed fixes means the theory is wrong

Stop after three attempts when each attempt revealed a new problem elsewhere, or needed broad refactoring, or created a new symptom.

That pattern is an architectural signal, not a run of bad luck. Go up one level, name the assumption that keeps failing, and raise it with the human.

## Red flags

Return to Phase 1 when you catch yourself:

- Proposing a fix before tracing the data.
- Saying "just try changing X and see".
- Changing several things at once.
- Saying "it is probably X, let me fix that".
- Attempting "one more fix" after two failures.
- Claiming "it should work now" without running a test.

## Excuses, and the reality

| Excuse | Reality |
| --- | --- |
| "Too simple to need this" | Simple failures have causes too. |
| "No time" | One structured pass beats guessing. |
| "I already know the fix" | State the cause first, then test it. |
| "I will investigate after the fix" | The fix destroys the evidence. |
| "The symptom is gone" | An unexplained success leaves the work open. |
| "The test passes now" | Confirm the test would fail without the fix. |

## Report

Return the reproduction, the diagnosis, the discriminating evidence, the repair, the guard, the verification, and the remaining uncertainty.

Report the observation and the interpretation as separate layers.
