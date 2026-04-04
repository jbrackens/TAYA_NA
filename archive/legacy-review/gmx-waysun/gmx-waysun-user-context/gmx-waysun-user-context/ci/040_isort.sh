#!/usr/bin/env bash
set -e
DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )"

source ${DIR}/common.sh


header Sorting imports
if [[ ${CHECK} == "check" ]]; then
  isort --profile black --line-width 120 --check-only ./user_context
else
  isort --profile black --line-width 120 ./user_context
fi
echo OK