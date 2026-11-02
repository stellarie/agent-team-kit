---
description: Register the superagent watchdog as a Windows scheduled task that runs every 10 minutes
allowed-tools: Bash(schtasks:*)
---

Register the watchdog with this exact command, then report the result:

```
schtasks /Create /F /SC MINUTE /MO 10 /TN superagent-home-watchdog /TR "node \"${CLAUDE_PLUGIN_ROOT}/core/bin/superagent.mjs\" watchdog"
```

Tell the user two facts:

- Remove it with `schtasks /Delete /F /TN superagent-home-watchdog`.
- Run this command again after each plugin update, because the plugin path changes with the version.
