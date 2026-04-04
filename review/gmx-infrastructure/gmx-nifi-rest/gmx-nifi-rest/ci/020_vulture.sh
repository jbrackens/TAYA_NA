#!/usr/bin/env bash
set -e
DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )"

source ${DIR}/common.sh

header Lunching vultures - removing dead code
vulture ./gmx_nifi_rest --min-confidence 80
echo OK
