#!/usr/bin/env bash

set -e -o pipefail -u -x

for dir in deploy/helm/phoenix-*; do
  for env_file in $dir/envs/*.yaml; do
    helm lint "$dir" --strict --values "$env_file" --set image.tag=latest
  done
done
