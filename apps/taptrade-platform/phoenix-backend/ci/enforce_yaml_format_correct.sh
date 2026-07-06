#!/usr/bin/env bash

set -e -o pipefail -u

# https://mikefarah.gitbook.io/yq/upgrading-from-v3#validate-documents
for yaml in $(git ls-files 'k8s-operations/users/*.yaml'); do
  if ! yq eval true "$yaml" >/dev/null; then
    echo -e "\nFile $yaml is malformed, please check."
    exit 1
  fi
done