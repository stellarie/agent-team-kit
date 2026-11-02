# superagent-corp

Resident GitHub agent for a managed work machine: one Claude Code Worker at a time, no persona, owner allowlist.

This plugin wraps the superagent core in `core/`. Read `core/README.md` for the full contract.
Do not edit `core/` here. Edit `superagent/core/` at the repository root, then run `scripts/sync-superagent-core.sh`.

## Install

```text
/plugin marketplace add stellarie/agent-team-kit
/plugin install superagent-corp@agent-team-kit
```

## Set up

1. Sign `gh` in as a dedicated agent account.
2. Copy `config.example.json` from this plugin to `~/.superagent/config.json`. Fill in every placeholder.
3. Run `/superagent-corp:doctor` and fix each failed check.
4. Run `/superagent-corp:start`.
5. Run `/superagent-corp:watchdog-install` once.

## Commands

| Command | Effect |
| --- | --- |
| `/superagent-corp:start` | Start the loop in the background. |
| `/superagent-corp:stop` | Stop the loop. |
| `/superagent-corp:status` | Show the loop, the queue, and each thread. |
| `/superagent-corp:doctor` | Check tools, sign-ins, and the agent login. |
| `/superagent-corp:watchdog-install` | Register the watchdog task. |
| `/superagent-corp:ask` | Queue a local task. |
| `/superagent-corp:show` | Show the reports for a local task. |

## Work machine rules

- Check that your employer's policy allows a resident agent before the first start.
- Keep `promptOverlay` at `null`. This plugin ships no persona text.
- List only your work org in `policy.allowedOwners`. The service refuses any other repo owner.
- The service caps `maxWorkers` at 1.
- Keep the config on the work machine. Never commit it.
- When policy forbids a scheduled task, skip `watchdog-install`. Run `doctor` and `watchdog` by hand.

## Without GitHub

Set `"source": "local"` to run with no GitHub access. Start from `config.local.example.json`.

- `localRepos` maps a short name to a local git checkout.
- `ask` queues a task. A Worker branches `feat/sa-<n>` from the checkout HEAD and commits there. It never pushes.
- `show` prints the Worker reports for one task.
- To follow up on a task, run `ask "<text>" --thread <n>`.

## Token budget

| Key | Effect |
| --- | --- |
| `router` | `off` skips the Router model. `label-starts` skips it for labeled events. Local defaults to `off`. |
| `budget.effort` | Reasoning effort: `low`, `medium`, `high`, `xhigh`, or `max`. |
| `budget.reportWords` | Word cap on each Worker report. |
| `budget.routerBodyChars` | Characters of each event body sent to the Router. |
| `budget.maxUsdPerRun` | Claude only: stop a Worker run at this cost. |
| `budget.lean` | Claude only: `--bare` and no MCP servers. Needs API-key sign-in. |
| `models` | Use a light Router model and a mid-size Worker model. |
| `maxWorkers` | Keep at 1. |

A follow-up resumes the Worker session, so the prompt cache stays warm.


## Fallback

When this plugin cannot run, use the skill `dev-superagent-workflow` from this kit.
