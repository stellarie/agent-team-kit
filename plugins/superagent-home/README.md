# superagent-home

Resident GitHub agent for a personal machine: a Router dispatches, Claude Code Workers open draft PRs.

This plugin wraps the superagent core in `core/`. Read `core/README.md` for the full contract.
Do not edit `core/` here. Edit `superagent/core/` at the repository root, then run `scripts/sync-superagent-core.sh`.

## Install

```text
/plugin marketplace add stellarie/agent-team-kit
/plugin install superagent-home@agent-team-kit
```

## Set up

1. Sign `gh` in as a dedicated agent account.
2. Copy `config.example.json` from this plugin to `~/.superagent/config.json`. Fill in every placeholder.
3. Run `/superagent-home:doctor` and fix each failed check.
4. Run `/superagent-home:start`.
5. Run `/superagent-home:watchdog-install` once.

## Commands

| Command | Effect |
| --- | --- |
| `/superagent-home:start` | Start the loop in the background. |
| `/superagent-home:stop` | Stop the loop. |
| `/superagent-home:status` | Show the loop, the queue, and each thread. |
| `/superagent-home:doctor` | Check tools, sign-ins, and the agent login. |
| `/superagent-home:watchdog-install` | Register the watchdog task. |

## Persona

`promptOverlay` appends your own instruction file to the Router and Worker prompts. The example points at `~/.claude/CLAUDE.md`. Set it to `null` for none.

## Fallback

When this plugin cannot run, use the skill `dev-superagent-workflow` from this kit.
