@AGENTS.md

## Claude Code notes

- Claude Code reads skills from `.claude/skills/`. That folder is a copy of `.agents/skills/`.
- Edit skills in `.agents/skills/`. Then run `scripts/sync-skills.sh` or `scripts/sync-skills.ps1`.
- Subagents are the usual "workers" in `dev-orchestrate`. Give each one a bounded scope.
- Plugins are listed in `PLUGINS.md`.
