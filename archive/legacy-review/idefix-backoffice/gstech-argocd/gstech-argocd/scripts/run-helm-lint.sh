#!/usr/bin/env bash

set -euo pipefail

APPS=$(cat ${APP_ENV}/${APP_ENV}_applicationset.yaml | yq -r '.spec.generators[0].list.elements | .[] | @base64')

for item in $APPS; do
  _get() {
     echo ${item} | base64 --decode | jq -r ${1}
  }

  APP_HELM_DIR=helm/$(_get '.helm_dir')
  APP_HELM_CHART=$(_get '.helm_chart')
  APP=$(_get '.app_name')

  echo "::group::Running $APP"

  helm lint $APP_HELM_CHART --values $APP_HELM_DIR/common.yaml --values $APP_HELM_DIR/$APP_ENV.yaml
  helm template $APP_HELM_CHART --values $APP_HELM_DIR/common.yaml --values $APP_HELM_DIR/$APP_ENV.yaml --output-dir out-$APP_ENV-$APP
  kubeconform -schema-location default -kubernetes-version=1.24.0 -schema-location '/etc/kubeconform/{{ .ResourceKind }}.json' -summary out-$APP_ENV-$APP
  pluto detect-files -d out-$APP_ENV-$APP -r
done
