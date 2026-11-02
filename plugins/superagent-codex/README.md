# superagent-codex

Resident GitHub agent for a managed work machine. Codex Workers run with `--sandbox workspace-write`, one at a time.

This plugin wraps the superagent core in `core/`. Read `core/README.md` for the full contract.
Do not edit `core/` here. Edit `superagent/core/` at the repository root, then run `scripts/sync-superagent-core.sh`.

Codex plugins carry skills, not commands. Ask Codex to "start superagent", "superagent status", and so on.

## Install

```sh
codex plugin marketplace add stellarie/agent-team-kit --ref main --sparse .agents/plugins
codex plugin add superagent-codex@agent-team-kit
```

If the machine cannot reach github.com, clone the kit by an approved route.
Then run `codex plugin marketplace add <path to the clone>`.

## Set up

1. Check that your employer's policy allows a resident agent before the first start.
2. Sign `gh` in as a dedicated agent account. Run `codex login status` and confirm exit 0.
3. Copy `config.example.json` from this plugin to `~/.superagent/config.json`. Fill in every placeholder, including the two model ids.
4. Ask Codex to run superagent doctor. Fix each failed check.
5. Ask Codex to start superagent.
6. Run `node core/bin/superagent.mjs watchdog` every 10 minutes from a scheduler, if policy allows one.

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
| `budget.maxUsdPerRun` | Claude only, ignored here: stop a Worker run at this cost. |
| `budget.lean` | Claude only, ignored here: `--bare` and no MCP servers. Needs API-key sign-in. |
| `models` | Use a light Router model and a mid-size Worker model. |
| `maxWorkers` | Keep at 1. |

A follow-up resumes the Worker session, so the prompt cache stays warm.

## Work machine rules

- This plugin ships no persona text. Keep personas in your own `~/.codex/AGENTS.md`.
- List only your work org in `policy.allowedOwners`.
- Keep the config on the work machine. Never commit it.

## Fallback

When this plugin cannot run, use the skill `dev-superagent-workflow` from this kit.
