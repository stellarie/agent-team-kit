---
description: Show the superagent loop, queue, and threads
allowed-tools: Bash(node:*)
---

!`node "${CLAUDE_PLUGIN_ROOT}/core/bin/superagent.mjs" status $ARGUMENTS`

Summarize the table above. Point out any thread in `stalled`, `timeout`, or `failed`.
