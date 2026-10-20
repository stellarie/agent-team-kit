---
name: dev-code-review
description: Ask for a review, and receive one with technical rigor. Read before handing work to a reviewer, before merging, and when acting on review findings or pushback.
---

# Code Review

Two directions, one standard. A review is a technical exchange, not a social performance.

## Asking for a review

Ask after each work slice, before a merge, and when you are stuck.

Hand the reviewer crafted context. Never hand over your session history. The reviewer must judge the work product, not your reasoning.

Give exactly this:

1. What changed, in one line.
2. The requirement or the plan it must satisfy.
3. The base revision and the head revision.
4. The acceptance criterion, and the evidence already gathered.
5. The files in scope.

Use a worker for the review, so the diff and the evaluation stay in its context and only the findings return.

Act on findings by severity:

- Blocking breaks behavior, security, or data. Fix it before anything else.
- Important is fixed before you proceed.
- Minor is recorded, then decided.

## Receiving a review

1. Read the whole review without reacting.
2. Restate the requirement in your own words, or ask.
3. Verify the claim against the code. Do not take it on faith.
4. Evaluate it for this codebase, not for codebases in general.
5. Respond with technical reasoning, or fix it.
6. Implement one item at a time, testing each.

### Forbidden

- "You're absolutely right!"
- "Great point!" or "Excellent feedback!"
- "Thanks for catching that." Gratitude is not a technical response.
- Implementing anything before verifying it.

State the fix, or state the technical reason it is wrong. The change in the code is the acknowledgement.

### When an item is unclear

Stop. Ask about every unclear item before you implement any of them. Items in one review are usually related, so a partial understanding produces a wrong implementation.

With items 1 to 6, and items 4 and 5 unclear, say so. Do not implement 1, 2, 3, and 6 first.

### Verify before you accept

1. Is it correct for this codebase?
2. Does it break working behavior?
3. Is there a reason the current code does it this way?
4. Does the reviewer have the full context?
5. Does it work on every platform the code supports?

When a suggestion proposes a "proper" implementation of something, search for its callers first. Unused code earns removal, not expansion.

### Push back when

- The suggestion breaks working behavior.
- The reviewer lacks context you have.
- It adds an unused feature.
- It is wrong for this stack or this platform.
- It conflicts with a decision the human already made.

Push back with evidence: a test, a call site, or the standards page. Bring the human in when the decision is architectural.

### When your pushback was wrong

Say so in one sentence, factually: what you checked, what it showed, and that you are implementing it. Do not apologize at length, and do not explain why you pushed back.

## Convergence

Separate reviewers can share one mistaken premise. When two reviewers agree, ask whether a single root error explains both.

Require distinct evidence where risk warrants it, such as a requirement-derived test plus an observed user flow.

## Review threads

Reply inside the review comment thread, not as a new top-level comment.

## Red flags

- Reviewing your own diff and calling it reviewed.
- Skipping review because the change is small.
- Implementing a review item you have not verified.
- Arguing with valid technical feedback.
- Treating agreement between reviewers as independent evidence.
- Matching work to a reviewer's preference against the house standard.
