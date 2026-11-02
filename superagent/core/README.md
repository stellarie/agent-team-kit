# superagent core

A small local service that turns GitHub events into agent work. It follows the
Super-agent design: one resident Router dispatches, and isolated Workers do the work.
It drives Claude Code (`claude -p`) or Codex (`codex exec`). It needs Node 24 or later,
`git`, and `gh`. It has no npm dependencies and no build step.

The plugins in `../../plugins/` wrap this service. Each plugin carries its own copy
in `core/`, written by `scripts/sync-superagent-core.sh`. Edit this directory, then sync.

## How it works

| Part | What it does |
| --- | --- |
| Poll | Every `pollSeconds`, read new issues, issue comments, and PR review comments in `repos`. |
| Fast Path filter | Drop events from logins outside `allow.logins`, and events with no trigger label or mention. No model sees a dropped event. |
| Pass-through | An event on a thread a Worker owns goes to that Worker session. The Router is not called. |
| Router | Once per loop, one read-only model call decides `start`, `ask`, or `ignore` for each queued thread. |
| Worker | One git worktree on `feat/sa-<number>` per thread. Workers open draft PRs only. |
| Watchdog | `superagent watchdog` runs one pass from a timer. It restarts a dead loop and stops stalled or overlong Workers. |

Workers never get a permission bypass. Claude Workers run in `acceptEdits` with a tool
allowlist. Codex Workers run with `--sandbox workspace-write`. No Worker merges, pushes
to the default branch, or marks a PR ready for review.

## Setup

1. Create a GitHub account for the agent. Give it write access to the target repos.
   Sign `gh` in as that account: `gh auth login`.
2. Copy `config.example.json` to `~/.superagent/config.json` and fill it in.
   Keep the config outside any repository.
3. Run `node bin/superagent.mjs doctor`. Fix each failed check.
4. Run `node bin/superagent.mjs start`.
5. Run `node bin/superagent.mjs watchdog` every 10 minutes from a scheduler.

## Commands

| Command | Effect |
| --- | --- |
| `start` | Start the loop in the background. Log: `<stateDir>/loop.log`. |
| `stop` | Stop the loop. Running Workers finish on their own. |
| `status` | Print the loop state, the queue size, and each thread. |
| `doctor` | Check tools, sign-ins, and the agent login. |
| `watchdog` | Run one watchdog pass. |

All commands take `--config <path>`. The default is `~/.superagent/config.json`,
or `$SUPERAGENT_CONFIG` when set.

## Config

| Key | Meaning |
| --- | --- |
| `runtime` | `claude` or `codex`. |
| `repos` | `owner/name` list to watch. |
| `allow.logins` | Logins that may trigger work. Required. |
| `policy.allowedRuntimes` | Runtimes this machine may use. |
| `policy.allowedOwners` | Repo owners this machine may work on. |
| `policy.maxWorkersCap` | Upper bound for `maxWorkers`. |
| `policy.forbiddenLogins` | `doctor` fails when `gh` is signed in as one of these. |
| `policy.allowOwnLogin` | Skip that check. |
| `trigger.label`, `trigger.mention` | What makes a new thread visible. |
| `models.router`, `models.worker` | Model ids for each role. |
| `worktreeRoot` | Where clones and worktrees live. |
| `watchdog.stallMinutes`, `watchdog.maxRunMinutes` | Stop limits. |
| `promptOverlay` | Markdown file appended to both prompts, or `null`. |
| `testCommand` | Extra Bash command Claude Workers may run, such as `npm test`. |

## Without the service

The skill `dev-superagent-workflow` walks one ordinary session through the same steps by hand.

## Tests

```sh
node --test --test-concurrency=1 "test/*.test.ts"
```
