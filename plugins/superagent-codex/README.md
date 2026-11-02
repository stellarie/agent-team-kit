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

## Work machine rules

- This plugin ships no persona text. Keep personas in your own `~/.codex/AGENTS.md`.
- List only your work org in `policy.allowedOwners`.
- Keep the config on the work machine. Never commit it.

## Fallback

When this plugin cannot run, use the skill `dev-superagent-workflow` from this kit.
