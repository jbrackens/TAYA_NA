#!/bin/bash

set -e -o pipefail -u

if [[ $# -ne 1 ]]; then
  echo "Usage: $0 <directory>"
  exit 1
fi

directory=$1
if ! [[ -d $directory ]]; then
  echo "$directory directory does not exist!"
  exit 1
fi

if ! git diff-index --quiet HEAD -- "$directory"; then
  echo "There are uncommitted changes in $directory !"
  echo "Please stash them before running the operation to avoid surprises."
  exit 1
fi
