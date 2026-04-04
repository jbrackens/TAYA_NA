#!/usr/bin/env bash

# List all env var names (strings of the form `ABC_123_4K9`)
# located in the git-tracked files whose path relative to repository root fully matches the specified regex.

set -u

if [[ $# -ne 1 ]]; then
  echo "Usage: $(basename $0) <full-path-regex>"
  echo
  echo "Example: $(basename $0) '.*(\.conf|logback.*\.xml)'"
  exit 1
fi

path_regex=$1

git ls-files \
  | grep --extended-regexp --line-regexp "$path_regex" \
  | xargs grep \
    --extended-regexp --word-regexp \
    --only-matching --no-filename \
    '[A-Z][A-Z0-9]*(_[A-Z0-9]+)+' -- \
  | sort -u
