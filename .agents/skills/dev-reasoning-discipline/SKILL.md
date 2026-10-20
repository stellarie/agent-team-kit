---
name: dev-reasoning-discipline
description: Reasoning discipline for a hard problem. Read when a task is unclear, a bug resists fixes, evidence conflicts, or you are about to report something complete.
---

# Reasoning Discipline

These rules hold regardless of conversational style. Style never bends a fact.

## Intake

- Classify the ask first: question, task, decision, exploration, diagnosis, or discussion. Each needs a different deliverable.
- The two costliest errors are twins. Fixing when asked to assess is one. Assessing when asked to fix is the other.
- State the acceptance criterion. If you cannot state one, the task is not framed yet.
- List your assumptions. Check the ones the result depends on.
- Honor the letter of the request. Name any divergence; never override it silently.
- When an ask is oddly specific with no stated goal, suspect an XY problem. Answer the question, and surface the goal.

## Scope

- Keep the smallest scope that fully satisfies the request and leaves the affected artifacts consistent.
- Derive the scope from the acceptance criterion, not from the tour of things you noticed on the way.
- Ask of every inclusion: does the acceptance criterion fail without this?
- Everything your change makes false is in scope. That covers docs, comments, and names.
- Existing mess is out of scope. Report it; do not fix it.
- If the change needs "and while I was there", stop and report instead.
- Write the non-goals down. An unstated non-goal reads later as a thing forgotten.
- Surface a material change to scope, cost, or risk before proceeding beyond authorization.

## Scale

- Name the altitude: strategy, approach, implementation, or mechanics. Drift between altitudes is a decision, not a current.
- Every local fix works and the whole still fails: go up one level.
- Whack-a-mole means the cause lives one level up.
- Blow the timebox with confidence still low: stop, report, and propose a smaller probe.
- Scale ceremony to stakes and reversibility, never to how interesting the problem is.

## Evidence

- Rank the sources: a command you ran, then the current artifact, then a test, then local documentation, then an official source, then your recall.
- Never let a junior source override a senior one. Your recall of an API is a hypothesis. The source file is a fact.
- Verify a changeable specific. A remembered flag, path, or version is a hypothesis until someone checks it.
- Ask whether the answer depends on a version that changed after your training. If it does, check it live.
- "My search found nothing" is evidence about the search. Vary the method before you conclude.
- One strong contrary observation outweighs many agreeing ones.
- Stop gathering when the evidence is corroborated or the budget is gone. Label what remains.

## Decompose

- Split for verifiability and localization, not for a tidy checklist.
- Give every piece its own one-line acceptance criterion. A piece you cannot verify is a fraction, not a piece.
- Put the step most likely to kill the plan first. Starting with the easy parts is progress theater.
- Verify one piece, then lock it. Never stack a second experiment on an unverified first.
- Progress means risk retired, not pieces completed.

## Debug

- Do not fix before you understand. An unexplained fix destroys the evidence.
- Read the whole error. Start with the first error, not the loudest one.
- Reproduce first, then make the reproduction smaller.
- Change one variable per experiment.
- Ask "what changed?" The most recent change is the usual cause.
- State two rival causes, and design a check that separates them.
- Predict the expected observation before a consequential experiment. Compare the result, and update the plan when the evidence disagrees.
- After three failed fixes on one theory, return to the raw evidence and check whether the modified code executes.

Load `dev-debug` for the full procedure.

## Conclude

- A conclusion needs a claim, the evidence for it, and a stated confidence. A conclusion missing a leg is a guess in formal wear.
- Before you accept an explanation, name two other explanations for the same evidence.
- Design a check that fails if you are wrong, and run it.
- Convergence counts only when the lines are independent. Three echoes of one source are one source.
- Prefer the mundane explanation first: your code, then configuration, then the dependency, then the platform.
- Report the observation and the interpretation as separate layers.
- For a consequential conclusion, report the claim, the evidence, the confidence, and the observation that would change it.
- Do not change an assessment merely because someone challenges it.

## Report complete

- Evidence comes before claims. "It should work" is a confession.
- Never report from the plan. Report from the observation.
- Verify the claim you were asked about, not a proxy. Green tests on code that never ran prove nothing.
- Re-read the original request, clause by clause. The last clause is the one most often missed.
- Report a failed check as failed, a skipped check as skipped, and unverified work as unverified.
- Re-verify after the last small change. The untested final touch is a classic assassin.

Load `dev-verification-before-completion` for the gate.

## Provenance

This file condenses a longer reasoning manual. The manual covers intake, scoping, scaling, evidence, decomposition, conclusions, uncertainty, debugging, completion, and failure modes. This file keeps the rules and drops the narration.
