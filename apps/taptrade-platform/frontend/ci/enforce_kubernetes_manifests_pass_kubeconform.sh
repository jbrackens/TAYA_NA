#!/usr/bin/env bash

set -euox pipefail

for values in deploy/helm/taptrade-ui/envs/*; do
  helm template deploy/helm/taptrade-ui --values $values --output-dir out
  kubeconform -schema-location default -kubernetes-version=1.21.0 -summary out
  rm -rf out
done
