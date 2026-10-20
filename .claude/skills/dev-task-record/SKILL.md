---
name: dev-task-record
description: Write and update the durable task record and its companion work records. Read when a request needs a contract, a locked plan, a status handoff, or a record of worker results.
---

# Development Task Record

One task is one record. The record is the contract for the work. It is never a chat log.

Keep the record at an agreed project location. The deployment names that location. Ask for the absolute path when the runtime does not supply one. Never guess a home directory.

Use a companion work record for each delegated assignment.

A task record is a working note. Keep it out of version control unless the human asks. Add its directory to `.gitignore`.

## Frontmatter

```yaml
task: {id}
protocol: dev-task-record/v1
initiator: {orchestrator | human}
execution_mode: solo | delegated | auto
status: planning | ready | implementing | review | verifying | done | blocked
owner: {name | none}
next_action: {one concrete action}
verifier: {name, required when status is verifying}
created: {YYYY-MM-DD}
updated: {YYYY-MM-DD}
project: {repository or directory}
base_revision: {revision the plan was read against}
verify_cmd: {one command that proves the current acceptance state}
last_verified: {revision} {pass | fail} {YYYY-MM-DD}
depends_on: [{id}, ...]
```

Omit `depends_on` when the task has none.

Set `verify_cmd` and `last_verified` before status `review`. Update
`last_verified` after every gate run. Omit both while status is `planning`
or `ready`. A task that changes no repository file may omit both.

## Sections

```markdown
# {Task Title}

## Objective
{What and why. Enough context to work without this conversation.}

## Acceptance Test
{One criterion per line. Tag every line with who can check it.}

## Plan
{Target files and what changes in each. Interfaces, data flow, edge cases, non-goals.}

## Rollback
{Omit unless the change is hard to undo.}

## Work Items
{One block per delegated assignment.}

## Implementation Notes
{The implementer fills this. What was done, and every deviation from the plan.}

## Review
{The reviewer fills this. Findings, approval, or requested changes.}

## Workers
{One block per worker, in any phase. Write "None." when no worker ran.}

## Thread
{Asynchronous question and answer. One topic per entry.}
```

## Acceptance criteria tags

- `[auto]` - a command proves it. Name the command.
- `[manual]` - a human runs the app or the flow. Name the steps.
- `[review]` - a reader confirms it in the diff.

Prefer `[auto]`. Convert a `[manual]` criterion to `[auto]` when a pure function can carry the assertion.

Give every criterion a mechanism in the Plan. Cut a Plan step that serves no criterion. A step that serves no criterion is scope creep.

## Status lifecycle

| Status | Meaning | Who sets it |
| --- | --- | --- |
| `planning` | The plan is being written. Do not start. | Orchestrator |
| `ready` | The plan is locked. Handoff signal. | Orchestrator |
| `implementing` | The implementer is working, or repairing findings. | Implementer |
| `review` | Code complete. Waiting on the reviewer. | Implementer |
| `verifying` | Review passed. Manual criteria still unrun. | Reviewer |
| `done` | Every acceptance criterion passed. Nothing pending. | Reviewer or human |
| `blocked` | Cannot continue. The reason is in Thread. | Either |

One unrun `[manual]` criterion means `verifying`, not `done`.

`ready` locks the plan. After `ready`, never edit the Plan section silently. Add a Thread entry that names what changed and why.

## Work item block

```yaml
owner: {name}
role: implement | review | adversarial | explore | repair | integrate
goal: One observable completion condition.
acceptance: The command or observation that proves the goal.
work_record: {relative path}
depends_on: [{id}, ...]
```

Mark a work item complete only after its acceptance criterion passes.

## Worker record

Use one block per worker. Do not use a table. The fields are too many for a table row.

```markdown
### {identifier}
- Spawned by: {orchestrator or implementer}
- Role: explore | implement | review | repair | integrate
- Model: {actual model identifier}
- Effort: {effective reasoning effort}
- Scope: {permitted write scope}
- Work record: {relative path}
- Task: {what you asked for, in one line}
- Outcome: {what happened, in one line}
```

Record a failed worker. A discarded worker gets a block that says so. A missing block reads as "no worker ran", which is false.

The Outcome line is not the Task line restated. Name the gap when the two differ.

Record the actual model. Do not invent a model identifier or assume a fixed model roster.

## Structured communication

Keep a notification compact and machine-readable:

```yaml
task_id: config-parser-17
work_item: review-02
sender: reviewer-01
recipient: orchestrator
worker_role: reviewer
event: FINDINGS
status: blocked
artifact: review-12
record: artifacts/review-12.md
result: Empty whitespace input bypasses default handling.
next_action: Add a failing regression case and repair parsing.
```

Recommended events: `READY`, `ACTIVE`, `DONE`, `FINDINGS`, `NEEDS_CONTEXT`, `BLOCKED`, `INVALID`.

Messages notify. Artifacts contain the complete evidence. Prefer a completion notification over repeated polling.

## Finding shape

```yaml
rule: Acceptance criterion or failure class
scenario: Concrete input and state
observed_or_predicted_failure: Wrong output, crash, or violated invariant
severity: blocking | important | minor
correction: Specific bounded action
```

A finding without a concrete failing scenario is discarded.

## Writing rules

- Write no conversational voice. No kaomoji, no exclamation, no chat register.
- Record the conclusion, never the search that found it.
- Cite a location: `src/app.rs:1014`. Do not describe where the code is.
- Keep an instruction sentence to 20 words and a descriptive sentence to 25. Load `dev-writing-ste100`.
- Use one topic per paragraph.
- Write the conclusion first, then the evidence.
- Keep temporary contracts, messages, and logs here. Keep durable knowledge in project memory.
- Store no credential, secret, or unnecessary personal data.

A bad entry:

```text
[worker, 2026-09-15] I looked through the settings window and traced how the
config flows, and after checking a few call sites I think there might be a
problem with the binding.
```

A good entry:

```text
[worker, 2026-09-15] Plan review round 1. Two issues.
1. settings_window.rs:2895 - the binding has no consumer after step 3.
2. main.rs:398 - the standalone path bypasses run. The extension is missing.
```

## Continuity

At each handoff, repair, and context restart, reread the contract and the unresolved findings.

Keep each load-bearing assumption labeled until someone verifies it or revises it. Repetition does not make an assumption a fact.

Before a hard budget limit, save a compact handoff here and request an increase or a smaller scope.
