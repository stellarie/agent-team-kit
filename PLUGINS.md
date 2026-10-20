# Plugins

Plugins this team uses. Every link below was checked on 2026-10-20 (HTTP 200).
Plugins are optional. The skills in this kit work without them.

## Claude Code

Marketplace: [`claude-plugins-official`](https://github.com/anthropics/claude-plugins-official).

Add the marketplace once:

```text
/plugin marketplace add anthropics/claude-plugins-official
```

Install a plugin:

```text
/plugin install <name>@claude-plugins-official
```

| Plugin | Purpose | Source |
| --- | --- | --- |
| `superpowers` | Skills for planning, TDD, debugging, and review | [obra/superpowers](https://github.com/obra/superpowers) |
| `frontend-design` | Guidance for distinctive UI design | [plugins/frontend-design](https://github.com/anthropics/claude-plugins-official/tree/main/plugins/frontend-design) |
| `feature-dev` | Guided feature development with explorer, architect, and reviewer agents | [plugins/feature-dev](https://github.com/anthropics/claude-plugins-official/tree/main/plugins/feature-dev) |
| `ralph-loop` | Run one prompt in a loop until a stop condition | [plugins/ralph-loop](https://github.com/anthropics/claude-plugins-official/tree/main/plugins/ralph-loop) |
| `context7` | Up-to-date library docs in the prompt (by Upstash) | [external_plugins/context7](https://github.com/anthropics/claude-plugins-official/tree/main/external_plugins/context7), upstream [upstash/context7](https://github.com/upstash/context7) |
| `pyright-lsp` | Python language server | [plugins/pyright-lsp](https://github.com/anthropics/claude-plugins-official/tree/main/plugins/pyright-lsp) |
| `rust-analyzer-lsp` | Rust language server | [plugins/rust-analyzer-lsp](https://github.com/anthropics/claude-plugins-official/tree/main/plugins/rust-analyzer-lsp) |

Notes:

- The marketplace index lists `superpowers` as an external plugin. Its source is the `obra/superpowers` repository, not a folder in the marketplace repository.
- The marketplace index points the homepage of some plugins at the mirror [anthropics/claude-plugins-public](https://github.com/anthropics/claude-plugins-public). Both repositories resolve.
- The `pyright-lsp` and `rust-analyzer-lsp` plugins need the language server binary on your `PATH`.

## DeepSeek Harness

Project: [deepseek-ai/deepseek-harness](https://github.com/deepseek-ai/deepseek-harness).
Start the web UI with `npx @deepseek-ai/dsh web`. Install and enable plugins from the **Plugins** page.
Package names were read from the repository's `package.json` files. The install steps on the Plugins page were not exercised.

### Stock bundles (`@deepseek-ai`)

| Package | Path in the repository |
| --- | --- |
| `dsh-base` | [packages/bundle/base](https://github.com/deepseek-ai/deepseek-harness/tree/master/packages/bundle/base) |
| `dsh-web-app` | [packages/bundle/web-app](https://github.com/deepseek-ai/deepseek-harness/tree/master/packages/bundle/web-app) |
| `dsh-subagent-codex` | [packages/subagent/subagent-codex](https://github.com/deepseek-ai/deepseek-harness/tree/master/packages/subagent/subagent-codex) |
| `dsh-subagent-claude-code` | [packages/subagent/subagent-claude-code](https://github.com/deepseek-ai/deepseek-harness/tree/master/packages/subagent/subagent-claude-code) |
| `dsh-experimental-agent-team-profile` | [packages/experimental/agent-team-profile](https://github.com/deepseek-ai/deepseek-harness/tree/master/packages/experimental/agent-team-profile) |
| `dsh-experimental-auto-review` | [packages/experimental/auto-review](https://github.com/deepseek-ai/deepseek-harness/tree/master/packages/experimental/auto-review) |
| `dsh-experimental-inspector-profile` | [packages/experimental/inspector-profile](https://github.com/deepseek-ai/deepseek-harness/tree/master/packages/experimental/inspector-profile) |
| `dsh-experimental-session-search` | [packages/experimental/session-search](https://github.com/deepseek-ai/deepseek-harness/tree/master/packages/experimental/session-search) |
| `dsh-experimental-plugin-market-bundle` | [packages/experimental/plugin-market-bundle](https://github.com/deepseek-ai/deepseek-harness/tree/master/packages/experimental/plugin-market-bundle) |
| `dsh-experimental-tool-worktree` | [packages/experimental/tool-worktree](https://github.com/deepseek-ai/deepseek-harness/tree/master/packages/experimental/tool-worktree) |
| `dsh-experimental-ralph-bundle` | [packages/experimental/ralph-bundle](https://github.com/deepseek-ai/deepseek-harness/tree/master/packages/experimental/ralph-bundle) |

### Third-party plugins

| Plugin | Purpose | Source |
| --- | --- | --- |
| DSH-better-sidebar | Sidebar foundation with file, terminal, side chat, Git, and sub-agent pages | [omdsh-dev/DSH-better-sidebar](https://github.com/omdsh-dev/DSH-better-sidebar) |
| superdesign | Design skill for coding agents | [superdesigndev/superdesign-skill](https://github.com/superdesigndev/superdesign-skill) |
| graph-memory | Knowledge-graph memory | [adoresever/graph-memory](https://github.com/adoresever/graph-memory) |
| dsh-pet | Desktop pet | [PC2005-cloud/dsh-pet](https://github.com/PC2005-cloud/dsh-pet) |
| whale-girl | Web GUI desktop pet | [vlln/whale-girl](https://github.com/vlln/whale-girl) |

Review a third-party plugin before you install it. It runs with your permissions.
