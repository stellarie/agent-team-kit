---
name: superagent-status
description: Show the superagent loop, queue, and threads. Use when the user asks to status superagent.
---

# superagent status

The plugin root is two directories above this file. Run this command:

```
node "<plugin root>/core/bin/superagent.mjs" status
```

Replace `<plugin root>` with the absolute path. Pass `--config <path>` only when the user names a config file.

Summarize the table. Point out any thread in `stalled`, `timeout`, or `failed`.
