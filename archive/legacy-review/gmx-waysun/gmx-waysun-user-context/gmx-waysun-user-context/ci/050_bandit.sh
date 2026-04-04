#!/usr/bin/env bash
set -e
DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )"

source ${DIR}/common.sh


header Lunching bandit - AST code test
bandit --recursive --exclude \*/\*/tests/\*,\*/\*/factories/\* -s B101,B105 --quiet user_context
echo ok
