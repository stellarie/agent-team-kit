---
name: dev-orchestrate
description: Coordinate bounded software development through neutral workers, independent review, and adversarial verification. Read for any non-trivial change that benefits from a second pair of eyes.
---

# Development Orchestration

Use this skill for non-trivial implementation. The orchestrator holds the contract, the authority, and the human relationship.

The orchestrator keeps one responsibility throughout: integration and final verification. Delegation never transfers it.

A role describes work. A role does not require another process. A worker is a subagent, a separate session, or the orchestrator in a separate pass, depending on what the runtime supports.

## Intake

1. Classify the request: question, task, decision, exploration, diagnosis, or discussion.
2. Deliver the requested kind of work. A review does not authorize repairs unless the human asks for them.
3. Write one observable acceptance criterion per deliverable. Map every requested deliverable to a criterion. One summary goal must not hide a second requirement.
4. Record the hard constraints, the non-goals, and the load-bearing assumptions.
5. Ask the human only when context cannot resolve the question, the answer changes the action, and a wrong guess is expensive.

## Select the execution mode

Record `execution_mode: solo | delegated | auto` in the task contract.

Honor a mode already selected for the continuing task. Otherwise present the tradeoffs for this task and wait for the human's selection. Read-only inspection may precede the selection.

| Mode | Execution | Tradeoff |
| --- | --- | --- |
| Solo | The orchestrator performs implementation, review, and adversarial checks. No workers. | Lower coordination cost; no independent reviewer. |
| Delegated | Workers take bounded assignments. The human approves each contract, verified slice, and final integration milestone. | Independent work with more interruptions. |
| Auto | Authorized workers proceed without routine milestone approvals. The orchestrator reviews and verifies integration. | Fewer interruptions; more delegated judgment. |

Solo mode uses separate review and falsification passes against the original request. Do not describe those passes as independent review.

In Delegated and Auto modes, use independent review for behavioral, shared, security-sensitive, or expensive-to-reverse changes.

When required independent review is unavailable, report that gate as unverified. Do not silently replace it with self-review.

For a trivial documentation edit, direct orchestrator review is enough. Scale ceremony to stakes and reversibility.

## Slice the work

- Slice by demonstrable behavior, not by file or by architectural layer.
- Give every slice its own acceptance criterion.
- Order the slices by the risk most likely to invalidate the plan.
- Use a walking skeleton when integration risk dominates.
- Parallelize only slices that can pass without each other and write disjoint files.
- Verify one slice before dependent work starts.
- Surface a material change to scope, cost, or risk before proceeding beyond authorization.

Record the slices in a task record. Load `dev-task-record` for the shape.

## Assign a worker

Every assignment carries these fields:

```yaml
role: implement | review | adversarial
contract_record: artifacts/<task-id>-contract.md
execution_mode: delegated
goal: One observable completion condition.
acceptance: The command or observation that proves the goal.
hard_constraints: [One line per constraint]
assumptions: [One line per assumption]
dependencies: [One line per dependency]
scope:
  read: [paths]
  write: [paths]
out_of_scope:
  - One line per excluded area.
required_checks:
  - One command per check.
stop_when:
  condition: One machine-checkable condition.
  max_attempts: 3
return:
  - summary
  - changed_files
  - commands_and_results
  - requirement_comparison
  - concerns
  - residuals
```

Send a Context Capsule, never the conversation history. The capsule carries the contract, the hard constraints, the non-goals, the assumptions, the unresolved findings, and the evidence provenance.

Keep mandatory context when the prompt must shrink. Reduce the assignment instead of dropping a constraint.

Load one role module per worker from `references/roles/`. Do not inject every skill into one worker. Do not pass the conversational style section to a worker.

## Review, then verify

1. Require a reviewer to read the acceptance contract before the implementation rationale.
2. Require a concrete failing scenario for every finding. Discard a finding without one.
3. Return findings as bounded correction tasks. The implementer repairs; the reviewer does not.
4. Treat repaired code as unreviewed until a reviewer checks it again.
5. Run an adversary against the contract when the change is behavioral, shared, security-sensitive, or expensive to reverse.

Separate workers do not guarantee independent evidence. Check whether one mistaken premise explains their agreement. Require distinct evidence where risk warrants it, such as a requirement-derived test plus an observed user flow.

## Integrate and close out

1. Read the diff yourself. A worker's completion report is a claim.
2. Compare every changed path against the declared write scope. Reject an unexpected path, and preserve the evidence before recovery.
3. Run the completion gate in `dev-standards`.
4. Confirm the original acceptance criterion ran. Run it if it did not.
5. Promote the durable lessons. Drop the session narration.
6. Report the outcome, the evidence, the residuals, and the human checks that remain.

## Red flags

Stop and correct when you catch yourself:

- Delegating a change you cannot verify.
- Accepting a worker's completion claim without reading the diff.
- Sending the whole conversation to a worker.
- Giving one worker two roles.
- Relabeling self-review as independent review.
- Spending the reserve that final checks need.
- Continuing locally to dodge a budget limit.
