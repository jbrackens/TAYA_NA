#!/usr/bin/env bash
set -e
DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )"

source ${DIR}/common.sh

header Fortmating code
if [[ ${CHECK} == "check" ]]; then
  black ./gmx_nifi_rest -l 120 --check --diff
else
  black ./gmx_nifi_rest -l 120
fi
echo OK
