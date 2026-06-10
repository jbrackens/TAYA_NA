#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

# Tracked symlinks must stay inside the repository. Absolute targets (or
# relative targets that climb above the repo root) only resolve on the
# machine they were created on, so a clean clone is not self-contained and
# tools that walk the package tree abort on the dangling links.
fail=0

while IFS=$'\t' read -r meta path; do
  [ -n "$path" ] || continue
  hash=$(printf '%s' "$meta" | awk '{print $2}')
  target=$(git cat-file -p "$hash")

  case "$target" in
    /*)
      echo "external symlink (absolute target): $path -> $target"
      fail=1
      continue
      ;;
  esac

  # Lexically resolve the target against the symlink's directory; a negative
  # depth at any point means the link escapes the repo root via '..'.
  dir=$(dirname "$path")
  if [ "$dir" = "." ]; then
    depth=0
  else
    depth=$(printf '%s' "$dir" | awk -F/ '{print NF}')
  fi
  escaped=0
  oldIFS=$IFS
  IFS=/
  for comp in $target; do
    case "$comp" in
      '' | '.') ;;
      '..')
        depth=$((depth - 1))
        if [ "$depth" -lt 0 ]; then
          escaped=1
          break
        fi
        ;;
      *) depth=$((depth + 1)) ;;
    esac
  done
  IFS=$oldIFS
  if [ "$escaped" -eq 1 ]; then
    echo "external symlink (escapes repo root): $path -> $target"
    fail=1
  fi
done < <(git ls-files -s | awk -F'\t' 'index($1, "120000 ") == 1')

if [ "$fail" -ne 0 ]; then
  echo "tracked symlinks must not point outside the repository"
  exit 1
fi

echo "no external symlinks check passed"
