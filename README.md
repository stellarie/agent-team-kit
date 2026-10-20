# agent-team-kit

A drop-in instruction set for AI coding agents. It works with Claude Code and with any agent that reads `AGENTS.md`, such as Codex.

The kit contains:

- `AGENTS.md`: the canonical instructions. They cover a persona, a writing standard, git rules, a completion gate, and reasoning principles.
- `CLAUDE.md`: imports `AGENTS.md` for Claude Code.
- `.agents/skills/` and `.claude/skills/`: 13 `dev-*` skills. The two folders are identical copies.
- `scripts/sync-skills.sh` and `scripts/sync-skills.ps1`: copy `.agents/skills` to `.claude/skills`.
- `PLUGINS.md`: recommended plugins for Claude Code and DeepSeek Harness.

## Install

1. Copy `AGENTS.md`, `CLAUDE.md`, `.agents/`, and `.claude/` into the root of your project.
   Copy `scripts/` too if you want to edit skills later.
2. Start your agent in the project. Claude Code reads `CLAUDE.md` and `.claude/skills/`. Codex reads `AGENTS.md` and `.agents/skills/`.
3. Ask for a small task. The agent should answer in the persona and load a skill when a task matches.

### Global install

Use a global install to apply the kit to every project.

- Claude Code: put the contents of `AGENTS.md` in `~/.claude/CLAUDE.md`, or import it from there with `@`. Copy `.claude/skills/*` to `~/.claude/skills/`.
- Codex: copy `AGENTS.md` to `~/.codex/AGENTS.md`. Copy `.agents/skills/*` to `~/.agents/skills/`.

If the project already has an `AGENTS.md` or `CLAUDE.md`, merge the files by hand. Do not overwrite them.

## Customize

### Persona

The persona lives in section 1 of `AGENTS.md`. To change it, edit that section.

- Turn it off for one session: tell the agent `--serious-mode`.
- Turn it off for good: delete section 1 and the kaomoji pool.
- Change the character: rewrite the bullets and the pool. Keep the rule that the persona never appears in commits, code comments, PR text, or docs.

### Skills

Edit the skills in `.agents/skills/`. That folder is canonical. Then run the sync script:

```sh
sh scripts/sync-skills.sh
```

```powershell
pwsh scripts/sync-skills.ps1
```

Check that the copies match:

```sh
diff -r .agents/skills .claude/skills
```

The command prints nothing when the folders are identical.

Each skill folder name must equal the `name` in its `SKILL.md` frontmatter. Install only the skills you use, because each skill description costs context on every request.

### Principles

Sections 2 to 5 of `AGENTS.md` hold the writing standard, the git rules, the completion gate, and the reasoning principles. Edit them to fit your team.

## Plugins

See [PLUGINS.md](PLUGINS.md).

## License

MIT. See [LICENSE](LICENSE).
