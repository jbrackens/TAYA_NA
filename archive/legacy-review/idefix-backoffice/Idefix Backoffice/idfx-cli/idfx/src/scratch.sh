#!/usr/bin/env bash
set -e

ORIG_DIR=$(pwd)
cd "$(dirname "$0")" || exit
source "./utils.sh"
source "./debug.sh"
source "./pg-fns.sh"

#### Debug stuff goes here

cd "$ORIG_DIR" || exit
