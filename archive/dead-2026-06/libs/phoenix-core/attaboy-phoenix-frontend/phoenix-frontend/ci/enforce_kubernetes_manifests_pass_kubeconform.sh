#!/usr/bin/env bash

set -euox pipefail

for values in deploy/helm/phoenix-ui/envs/*; do
  helm template deploy/helm/phoenix-ui --values $values --output-dir out
  kubeconform -schema-location default -kubernetes-version=1.21.0 -summary out
  rm -rf out
done
