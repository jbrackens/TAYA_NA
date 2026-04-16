#!/bin/bash

set -e -o pipefail -u

if [[ $# -ne 1 ]]; then
  echo "Usage: $(basename $0) <k8s-namespace-name>"
  exit 1
fi

expected_namespace=$1

actual_namespace=$(kubectl config view --minify -o jsonpath='{.contexts[0].context.namespace}')

if [[ $actual_namespace != "$expected_namespace" ]]; then
  echo "Switching to '$expected_namespace' namespace..."
  kubectl create namespace "$expected_namespace" &>/dev/null || true

  # There's apparently no way to switch namespace via `kubectl` without also passing the context name...
  # `kubens` (https://github.com/ahmetb/kubectx/blob/master/kubens) does exactly the same thing.
  current_context=$(kubectl config current-context)
  kubectl config set-context "$current_context" --namespace="$expected_namespace"
fi
