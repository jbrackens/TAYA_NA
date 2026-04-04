#!/usr/bin/env bash

set -e -o pipefail -u

for env_file in $(git ls-files '**/.env*'); do
  if grep --extended-regexp --with-filename --line-number ' =|= ' $env_file; then
    echo -e "\nFile $env_file contains spaces around '=' character, which is fine for 'env-file',"\
      "\nbut 'docker run --env-file' treats the spaces verbatim, so they will be included as a part of the var name and/or value." \
      "\nRemove the spaces (use the 'a=b' rather than 'a = b' format) to be compatible with both 'env-file' and 'docker run'."
    exit 1
  fi
done
