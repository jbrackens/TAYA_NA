#!/usr/bin/env bash

set -e -o pipefail -u

for dir in deploy/helm/*; do
  # Skip strict checks for the charts with dependencies since it can end up in a lot of false-positive errors.
  if grep --quiet --line-regexp 'dependencies:' $dir/Chart.yaml; then continue; fi
  if ! [[ -d $dir/envs/ ]]; then continue; fi

  for env_file in $dir/envs/*.yaml; do
    echo -e "\nChecking $dir against $env_file..."
    helm lint "$dir" --strict --values "$env_file" --set image.tag=latest
  done
done
