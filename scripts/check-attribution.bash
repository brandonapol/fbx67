#!/usr/bin/env bash
# Reads text on stdin and fails if any line carries AI attribution. Used by git/hooks/commit-msg on a commit
# message and by make check/attribution on a pull request's title, description and commit messages.
set -euo pipefail

text="$(tr -d '\r')"

patterns=(
  "Co-authored-by trailer crediting Claude" '^([^:]*: )?[[:space:]]*co-authored-by:.*claude'
  "Co-authored-by trailer using an Anthropic address" '^([^:]*: )?[[:space:]]*co-authored-by:.*anthropic\.com'
  "\"Generated with Claude Code\" footer" 'generated with.*claude'
  "Claude Code session link" 'claude\.ai/code'
)

matched=""
for ((i = 0; i < ${#patterns[@]}; i += 2)); do
  if hits="$(printf '%s\n' "${text}" | grep -inE "${patterns[i + 1]}")"; then
    matched+="  ${patterns[i]}:"$'\n'"$(printf '%s\n' "${hits}" | sed 's/^/    /')"$'\n'
  fi
done

if [[ -n "${matched}" ]]; then
  echo "AI attribution found. Commits and pull requests are authored by you alone."
  echo ""
  printf '%s' "${matched}"
  echo ""
  echo "${ATTRIBUTION_FIX:-Remove those lines and try again.}"
  exit 1
fi
