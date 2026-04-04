#!/usr/bin/env bash

logbody="$(echo "$1" | base64 --decode)"
bodylength=$(echo "$logbody" | jq length)

if [[ -n "$CBCOPY" ]]; then
  echo "$logbody" | jq -r "$CBCOPY" | pbcopy &>/dev/null
fi

if [[ $bodylength -eq 1 ]]; then
  echo "$logbody" | jq 'first' | jless
else
  echo "$logbody" | jless
fi
