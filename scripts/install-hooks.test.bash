#!/usr/bin/env bash
# Regression test for scripts/install-hooks.bash (#298): the installer must never point core.hooksPath at the
# tracked git/hooks, must not overwrite a hook already installed, and the launcher must run the tracked hook.
set -euo pipefail

src=$(cd "$(dirname "$0")/.." && pwd)
tmp=$(mktemp -d)
trap 'rm -rf "$tmp"' EXIT
fail() { echo "install-hooks test: $*" >&2; exit 1; }

cd "$tmp"
git init -q -b main repo
cd repo
git config user.email test@example.com
git config user.name test
mkdir -p git/hooks scripts
cp "$src/scripts/install-hooks.bash" scripts/
printf '#!/bin/sh\necho ran >> "$(git rev-parse --show-toplevel)/../pre-commit.log"\n' > git/hooks/pre-commit
printf '#!/bin/sh\nexit 0\n' > git/hooks/commit-msg
chmod +x git/hooks/*
git add -A && git commit -q -m init --no-verify
git config core.hooksPath git/hooks

scripts/install-hooks.bash > /dev/null
[[ -z "$(git config --get core.hooksPath || true)" ]] || fail "core.hooksPath is still set"
[[ -x .git/hooks/pre-commit && -x .git/hooks/commit-msg ]] || fail "launchers not installed in .git/hooks"
[[ -z "$(git status --porcelain)" ]] || fail "installer touched the working tree"

echo x > f && git add f && git commit -q -m f
[[ "$(cat ../pre-commit.log)" == ran ]] || fail "launcher did not run the tracked pre-commit"

printf '#!/bin/sh\n# Written by saddle\nexit 0\n' > .git/hooks/pre-commit
scripts/install-hooks.bash > /dev/null
grep -q 'Written by saddle' .git/hooks/pre-commit || fail "installer overwrote an existing hook"

echo "install-hooks test: ok"
