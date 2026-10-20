---
name: dev-analyze-codebase
description: Map an unfamiliar codebase, module, or feature before changing it. Read when onboarding to a repository, tracing a flow, or planning a change against code you have not worked in.
---

# Codebase Analysis

Understand before you act. The deliverable is a structured understanding, not a list of opinions.

## When to use it

- First time in a repository or a module.
- Asked to read, understand, map, explain, or analyze code.
- Before planning a change that touches unfamiliar code.
- When a task depends on data flow across modules.

## Phase 1 - Orient, broad and shallow

1. Find the entry points. Look for `main`, `index`, `mod.rs`, or the class that boots the system.
2. Read the shape: the top-level listing, the build system, the language, the framework.
3. Read the manifests. The dependencies and their versions show what the project leans on.
4. Read the existing documentation first: `README.md`, `AGENTS.md`, `MEMORY.md`, and `docs/`. Reading is faster than rediscovering.

Deliverable: one paragraph that says what this project is and how it is shaped.

## Phase 2 - Map the part that matters

Pick the subsystem the task touches, then:

1. Trace the data flow from entry to output. Name every layer it crosses.
2. Find the boundaries. Where are the module, package, or crate edges, and what crosses them?
3. Learn the conventions: naming, error handling, test layout, and logging. Note a deviation instead of adopting it.
4. Find the load-bearing abstractions. The traits, interfaces, and base types everything depends on are what a change must not break.

Deliverable: the layers, the boundaries, the key abstractions, and the conventions.

## Phase 3 - Assess

1. Risks: what is fragile, untested, or tightly coupled?
2. Patterns: what does this codebase do consistently? Follow it.
3. Unknowns: what could you not determine from reading? Name it.

Deliverable: risks, patterns to follow, and open questions.

## Report shape

```text
## Analysis: {module or repository}

### What it is
{one paragraph}

### Architecture
- {layer}: {purpose} ({key files})

### Data flow
{entry} -> {step} -> {step} -> {output}

### Conventions
- {pattern observed} (example: {file:line})

### Risks
- {risk}

### Open questions
- {what reading could not settle}
```

## Rules

- Read before judging. Finish Phase 1 before you form an opinion.
- Follow the data flow, not the folder order. Folders are organized for humans.
- Report what is, not what should be. Analysis is observation.
- Cite `file:line`. A claim without a location cannot be checked.
- Verify one documentation claim against the code. When it is wrong, the docs are stale. Say so.
- Work breadth first. Go deep only on the load-bearing parts. Never read every file.
- Stop when further reading no longer changes the plan.
- Before you finish, ask: could someone act on this without a follow-up question? If not, it is incomplete.

## Do not

- Modify a file unless the human separately asks for implementation.
- Report a risk without naming the file that carries it.
- Present a convention you observed once as a house rule.
- Guess at a signature. Read it.
