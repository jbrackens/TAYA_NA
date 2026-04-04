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

  echo "Fetching manifests for $APP_ENV-$APP"
  argocd app manifests $APP_ENV-$APP > $APP_ENV-$APP-live.yaml

  echo "Generating local manifests"
  helm template $APP_HELM_CHART \
    --name-template $APP_ENV-$APP \
    --namespace $APP_ENV \
    --values $APP_HELM_DIR/common.yaml \
    --values $APP_HELM_DIR/$APP_ENV.yaml > $APP_ENV-$APP-local.yaml

  python scripts/diff.py $APP_ENV-$APP-live.yaml $APP_ENV-$APP-local.yaml
done

