#!/bin/bash

set -e -o pipefail -u

if [[ $# -ne 1 ]]; then
  echo "Usage: $0 <expected-branch>"
  exit 1
fi

expected_branch=$1

# check jenkins environment first
actual_branch=${GIT_BRANCH##origin/}
# alternatively, fetch from git
actual_branch=${actual_branch:-$(git symbolic-ref --short --quiet HEAD 2>/dev/null)}
actual_branch=${actual_branch:-<none, detached HEAD>}

if [[ $actual_branch != "$expected_branch" ]]; then
  echo "You are currently on '$actual_branch' branch, while this operation requires that you are on '$expected_branch'!"
  echo "Please check out '$expected_branch'."
  exit 1
fi
