#!/usr/bin/env sh
# Copy .agents/skills (canonical) to .claude/skills.
# Replaces each skill directory; leaves other skills in .claude/skills alone.
set -eu

root=$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)
src="$root/.agents/skills"
dst="$root/.claude/skills"

[ -d "$src" ] || { echo "missing $src" >&2; exit 1; }
mkdir -p "$dst"

for dir in "$src"/*/; do
  name=$(basename "$dir")
  rm -rf "${dst:?}/$name"
  cp -R "$dir" "$dst/$name"
  echo "synced $name"
done
