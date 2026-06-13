#!/bin/bash

set -e -o pipefail -u

if [[ $# -lt 2 ]] || [ $# -gt 3 ]; then
  echo "Usage: $0 <command> <download-url> [<expected-version-prefix>]"
  exit 1
fi

command=$1
download_url=$2
expected_version_prefix=${3-}

if ! command -v $command &>/dev/null; then
  echo "$command (needed in a later stage of this script) not found on this machine; see $download_url"
  exit 1
fi

if [[ $expected_version_prefix ]]; then
  actual_version_string=$("$command" --version 2>/dev/null || "$command" version 2>/dev/null)
  actual_version=$(grep -Eo '[0-9]+\.[0-9.]+' <<< "$actual_version_string" | head -1)
  if ! [[ $actual_version == $expected_version_prefix* ]]; then
    echo "$command (needed in a later stage of this script) is found in version $actual_version but is expected in a version with prefix '$expected_version_prefix'; see $download_url"
    exit 1
  fi
fi
