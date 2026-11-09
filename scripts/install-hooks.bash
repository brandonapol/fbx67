#!/usr/bin/env bash
# Installs the repo's hooks (git/hooks/*) as launchers in the common .git/hooks, shared by every worktree.
# core.hooksPath stays unset: pointing it at the tracked git/hooks lets other hook installers (saddle) write over
# tracked files. A hook already in .git/hooks, saddle's wrapper or an earlier launcher, is left alone; saddle
# chains a launcher it finds as <name>.pre-saddle.
set -euo pipefail

top=$(git rev-parse --show-toplevel)
git config --unset core.hooksPath || true
hooks="$(git rev-parse --path-format=absolute --git-common-dir)/hooks"
mkdir -p "$hooks"

git -C "$top" ls-files git/hooks | while read -r src; do
  name=$(basename "$src")
  target="$hooks/$name"
  if [[ -e "$target" ]]; then
    echo "setup/hooks: $name already installed, left as is"
    continue
  fi
  cat > "$target" <<HOOK
#!/bin/sh
# Runs the repo's $src from the current worktree. Written by make setup/hooks.
hook="\$(git rev-parse --show-toplevel)/$src"
[ -x "\$hook" ] || exit 0
exec "\$hook" "\$@"
HOOK
  chmod +x "$target"
  echo "setup/hooks: installed $name"
done
