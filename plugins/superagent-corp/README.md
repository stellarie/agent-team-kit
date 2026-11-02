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

## Work machine rules

- Check that your employer's policy allows a resident agent before the first start.
- Keep `promptOverlay` at `null`. This plugin ships no persona text.
- List only your work org in `policy.allowedOwners`. The service refuses any other repo owner.
- The service caps `maxWorkers` at 1.
- Keep the config on the work machine. Never commit it.
- When policy forbids a scheduled task, skip `watchdog-install`. Run `doctor` and `watchdog` by hand.

## Fallback

When this plugin cannot run, use the skill `dev-superagent-workflow` from this kit.
