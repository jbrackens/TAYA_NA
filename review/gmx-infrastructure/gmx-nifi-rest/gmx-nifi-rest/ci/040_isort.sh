#!/usr/bin/env bash
set -e
DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )"

source ${DIR}/common.sh


header Sorting imports
if [[ ${CHECK} == "check" ]]; then
  isort --multi-line=3 --trailing-comma --force-grid-wrap=0 --combine-as --line-width 120 --recursive --apply  --check-only ./gmx_nifi_rest
else
  isort --multi-line=3 --trailing-comma --force-grid-wrap=0 --combine-as --line-width 120 --recursive --apply  ./gmx_nifi_rest
fi
echo OK
