#!/usr/bin/env bash

set -e -o pipefail -u

if find . -xtype l | grep ''; then
  echo -e "\nThe above symlinks point to non-existent targets, please check."
  exit 1
fi
