#!/bin/bash

set -e -o pipefail -u -x

if [[ $# -ne 5 ]]; then
  echo "Usage:"
  echo "$(basename $0) <ecr-base-chart-ref> <local-chart-name> <ecr-target-chart-repository> <docker-image-tag> <cluster-id>"
  echo
  echo "Fetches <ecr-base-chart-ref> Helm chart and then patches this chart with the selected (by <cluster-id>) values from <local-chart-name>."
  echo "Pushes the patched chart to <ecr-target-chart-repository>/<docker-image-tag>:<cluster-id>."
  echo
  echo "Example:"
  echo "$(basename $0) 259420793117.dkr.ecr.eu-west-1.amazonaws.com/phoenix-ui-app-helm-chart:0.1.2-build.3 phoenix-ui-app-darkstormlabs 259420793117.dkr.ecr.eu-west-1.amazonaws.com/phoenix-ui-app-darkstormlabs-helm-chart 0.42.1-build.1 virginia-dev"
  echo
  echo "The chart will be published as:"
  echo "259420793117.dkr.ecr.eu-west-1.amazonaws.com/phoenix-ui-app-darkstormlabs-helm-chart:0.42.1-build.1-virginia-dev"
  exit 1
fi

ecr_base_chart_ref=$1
ecr_base_chart_name=${1##*/}
ecr_base_chart_name=${ecr_base_chart_name%%:*}
local_chart_name=$2
ecr_target_chart_repository=$3
ecr_target_chart_name=${3##*/}
image_tag=$4
cluster=$5

./k8s-operations/ensure_command_available.sh helm 'https://helm.sh/docs/intro/install/'     '3.'
./k8s-operations/ensure_command_available.sh yq   'https://github.com/mikefarah/yq#install' '4.'

local_chart_dir=deploy/helm/$local_chart_name

prepared_chart_dir=target/prepared-helm-charts/$ecr_base_chart_name
rm -rf $prepared_chart_dir

# Note that we need to use Helm v3.6 (or earlier),
# since Helm v3.7 (despite supposedly following semver) removed `helm chart` completely.
export HELM_EXPERIMENTAL_OCI=1  # needed to enable `helm chart` commands
helm chart pull   "$ecr_base_chart_ref"
helm chart export "$ecr_base_chart_ref" --destination target/prepared-helm-charts/

local_values_file=${local_chart_dir}/envs/eks-${cluster}_phoenix.yaml

# Since the base chart ships withOUT values, let's first check if the local Helm values file will satisfy all required values in the chart.
helm lint --strict $prepared_chart_dir --values $local_values_file

# As of 3.7 (or any earlier version, for that matter), Helm doesn't allow for dry-run rendering values without a connection to an actual cluster:
#  * `helm template` doesn't require connection to cluster, but cannot render merged values (only the templates)
#  * `helm upgrade --dry-run --debug` renders values separately but requires a connection to an actual k8s cluster
# Given the very small amount of default values in values.yaml, using yq's `ireduce` is probably the cleanest way to merge the yamls.
# See https://mikefarah.gitbook.io/yq/v/v4.x/operators/reduce for `ireduce`
# and https://mikefarah.gitbook.io/yq/v/v4.x/operators/multiply-merge#merge-objects-together-returning-merged-result-only for `*`

yq eval-all '. as $item ireduce ({}; . * $item)' \
  --inplace ${prepared_chart_dir}/values.yaml \
  $local_values_file

cd $prepared_chart_dir
yq eval ".image.tag = \"$image_tag\""             --inplace values.yaml
yq eval ".name      = \"$ecr_target_chart_name\"" --inplace Chart.yaml

# As mentioned above, the chart version must include the name of the target environment (cluster) as well.
# We're overwriting whatever version was in the existing Helm chart - this is less important than the application version,
# and ArgoCD requires that the chart version recorded in Chart.yaml (version, not appVersion!)
# is exactly the same as the tag under which the chart lives on ECR.
# Note that `+` character, although allowed in semver, is NOT allowed within tags on ECR.
chart_version=$image_tag-$cluster
yq eval ".version = \"$chart_version\"" --inplace Chart.yaml

ecr_target_chart_ref=$ecr_target_chart_repository:$chart_version

helm chart save . "$ecr_target_chart_ref"
helm chart push   "$ecr_target_chart_ref"
