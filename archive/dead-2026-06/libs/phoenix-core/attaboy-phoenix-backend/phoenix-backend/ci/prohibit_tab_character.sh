#!/usr/bin/env bash

set -e -o pipefail -u

if git grep -I --line-number $'\t'; then
  echo
  echo 'The above lines contain tab character (instead of spaces), please tidy up'
  exit 1
fi
