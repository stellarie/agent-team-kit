#!/usr/bin/env sh
# Copy superagent/core into each plugins/*/core.
# --check: exit 1 when any copy differs.
set -eu

root=$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)
src="$root/superagent/core"
mode=${1:-sync}
status=0

for plugin in "$root"/plugins/*/; do
  dst="${plugin}core"
  if [ "$mode" = "--check" ]; then
    if ! diff -r -x test -x state -x node_modules "$src" "$dst" >/dev/null 2>&1; then
      echo "drift: $dst" >&2
      status=1
    fi
    continue
  fi
  rm -rf "$dst"
  mkdir -p "$dst"
  for item in package.json README.md config.example.json bin src prompts; do
    cp -R "$src/$item" "$dst/$item"
  done
  echo "synced $(basename "$plugin")"
done
exit $status
