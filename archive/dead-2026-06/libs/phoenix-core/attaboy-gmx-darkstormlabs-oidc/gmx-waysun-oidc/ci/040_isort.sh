#!/usr/bin/env bash
set -e
DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )"

source ${DIR}/common.sh


header Sorting imports
if [[ ${CHECK} == "check" ]]; then
  isort --profile black --line-width 120 --check-only ./src
else
  isort --profile black --line-width 120 ./src
fi
echo OK