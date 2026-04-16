#!/bin/bash

set -o xtrace

function show_usage() {
  echo "Usage:"
  echo "$(basename $0) <application-to-deploy> [<configuration-file>]"
  echo
  echo "Example:"
  echo "$(basename $0) phoenix-ingestion-oddin data-pipeline/oddin/app/deploy/remote/values.conf"
  echo "Important! Cloudflow applications have to be built before running this script."
  echo "See build_cloudflow_app_image_and_publish_to_ecr.sh"

  exit 1
}

set -e -o pipefail -u

if [[ $# -eq 0 ]] || [[ $# -ge 3 ]]; then
  show_usage
fi

application=$1
config=""
if [[ $# -eq 2 ]]; then
  config="--conf $2"
fi

kubectl cloudflow deploy --namespace cloudflow --no-registry-credentials target/"${application}".json -v debug ${config}
