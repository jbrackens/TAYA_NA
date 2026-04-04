#!/usr/bin/env bash

set -euo pipefail

kubernetes_version=1.21.0

argocd_rollouts_version=1.1.1
external_secrets_version=0.3.7
keycloak_operator_version=17.0.0
prometheus_operator_version=0.52.1

mkdir -p dist/crds
cd dist/crds

export FILENAME_FORMAT='{kind}'
openapi2jsonschema.py https://raw.githubusercontent.com/argoproj/argo-rollouts/v${argocd_rollouts_version}/manifests/crds/rollout-crd.yaml
openapi2jsonschema.py https://raw.githubusercontent.com/external-secrets/external-secrets/v${external_secrets_version}/deploy/crds/external-secrets.io_externalsecrets.yaml
openapi2jsonschema.py https://raw.githubusercontent.com/keycloak/keycloak-operator/${keycloak_operator_version}/deploy/crds/keycloak.org_keycloaks_crd.yaml
openapi2jsonschema.py https://raw.githubusercontent.com/keycloak/keycloak-operator/${keycloak_operator_version}/deploy/crds/keycloak.org_keycloakrealms_crd.yaml
openapi2jsonschema.py https://raw.githubusercontent.com/keycloak/keycloak-operator/${keycloak_operator_version}/deploy/crds/keycloak.org_keycloakclients_crd.yaml
openapi2jsonschema.py https://raw.githubusercontent.com/prometheus-operator/prometheus-operator/v${prometheus_operator_version}/example/prometheus-operator-crd/monitoring.coreos.com_servicemonitors.yaml
openapi2jsonschema.py https://raw.githubusercontent.com/prometheus-operator/prometheus-operator/v${prometheus_operator_version}/example/prometheus-operator-crd/monitoring.coreos.com_prometheusrules.yaml

cd ../../

# Render and validate all the values for all the Helm charts.
for dir in deploy/helm/*/; do
  dir=${dir%/}
  echo $dir

  # Skip strict checks for the charts with dependencies since it can end up in a lot of false-positive errors.
  if grep --quiet --line-regexp 'dependencies:' $dir/Chart.yaml; then continue; fi
  if ! [[ -d $dir/envs/ ]]; then continue; fi

  for values in $dir/envs/*; do
    helm template $dir --values $values --output-dir out
    kubeconform -schema-location default -kubernetes-version=$kubernetes_version -schema-location='dist/crds/{{ .ResourceKind }}.json' -summary out
    rm -rf out
  done
done

rm -rf dist/crds/
