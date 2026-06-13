#!/bin/bash

set -e -o pipefail -u

if [[ $# -lt 4 ]] || [[ $# -gt 5 ]]; then
  echo "Usage:"
  echo "$(basename $0) <local-chart-name> <local-module-name = app|office> <ecr-target-chart-repository> <docker-image-tag> [<cluster-id>]"
  echo
  echo "Example #1:"
  echo "$(basename $0) phoenix-ui app    259420793117.dkr.ecr.eu-west-1.amazonaws.com/phoenix-ui-app-helm-chart    0.1.2-build.3"
  echo
  echo "The chart will be published withOUT any env-specific Helm values as:"
  echo "259420793117.dkr.ecr.eu-west-1.amazonaws.com/phoenix-ui-app-helm-chart:0.1.2-build.3"
  echo
  echo
  echo "Example #2:"
  echo "$(basename $0) phoenix-ui office 259420793117.dkr.ecr.eu-west-1.amazonaws.com/phoenix-ui-office-helm-chart 0.2.3-build.4 virginia-dev"
  echo
  echo "The chart will be published WITH env-specific Helm values as:"
  echo "259420793117.dkr.ecr.eu-west-1.amazonaws.com/phoenix-ui-office-helm-chart:0.2.3-build.4-virginia-dev"
  exit 1
fi

local_chart_name=$1
module=$2
ecr_target_chart_repository=$3
ecr_target_chart_name=${3##*/}
image_tag=$4
cluster=${5-}

./k8s-operations/ensure_command_available.sh helm 'https://helm.sh/docs/intro/install/'     '3.'
./k8s-operations/ensure_command_available.sh yq   'https://github.com/mikefarah/yq#install' '4.'

# Theoretically we could just run `helm chart save` directly on `deploy/helm/$local_chart_name` directory...
# the problem is that we need a few changes to the chart before the release.
# For that reason, let's NOT operate on the original Helm chart directory directly,
# but instead make a copy in `$prepared_chart_dir`, apply the patches on that copy,
# and subsequently do `helm chart save` there.
prepared_chart_dir=target/prepared-helm-charts/$local_chart_name
mkdir -p $prepared_chart_dir  # to make sure that parent directories exist
rm -rf $prepared_chart_dir
# Note that some files are symlinked within the chart directory, mostly due to https://github.com/helm/helm/issues/3276.
# Passing `--dereference` to make sure they're copied as regular files (and not symlinks) into the soon-to-be-published chart.
# Even without `--dereference`, the script will still be correct since then `helm chart save` would dereference the symlinks on its own,
# but better to avoid any surprises here.
cp -r --dereference deploy/helm/$local_chart_name $prepared_chart_dir

cd $prepared_chart_dir

# As of 3.7 (or any earlier version, for that matter), Helm doesn't allow for dry-run rendering values without a connection to an actual cluster:
#  * `helm template` doesn't require connection to cluster, but cannot render merged values (only the templates)
#  * `helm upgrade --dry-run --debug` renders values separately but requires a connection to an actual k8s cluster
# Given the very small amount of default values in values.yaml, using yq's `ireduce` is probably the cleanest way to merge the yamls.
# See https://mikefarah.gitbook.io/yq/v/v4.x/operators/reduce for `ireduce`
# and https://mikefarah.gitbook.io/yq/v/v4.x/operators/multiply-merge#merge-objects-together-returning-merged-result-only for `*`

if [[ $cluster ]]; then
  yq eval-all '. as $item ireduce ({}; . * $item)' \
    --inplace values.yaml \
    envs/${module}_eks-${cluster}_phoenix.yaml
else
  echo "Cluster id not provided."
  echo 'Publishing the Helm chart with INcomplete set of values.'
  echo 'The missing values will need to provided by whatever consumes this published chart.'
fi

# Due to the limitations of ArgoCD's support for Helm charts,
# we canNOT use environment-specific files under envs/.
# All we can do is to rely on values.yaml.
# That's also the reason why we publish a separate Helm chart for each target cluster,
# rather than a single Helm chart with a few separate value files, one for each target cluster.
# See https://eegtech.atlassian.net/wiki/spaces/GMX3/pages/3074785298/Branching+Release+Deployment+Strategy#Build-and-Package as well.
rm -rf envs/

yq eval ".image.tag = \"$image_tag\""             --inplace values.yaml
yq eval ".name      = \"$ecr_target_chart_name\"" --inplace Chart.yaml

# As mentioned above, the chart version must include the name of the target environment (cluster) as well.
# We're overwriting whatever version was in the existing Helm chart - this is less important than the application version,
# and ArgoCD requires that the chart version recorded in Chart.yaml (version, not appVersion!)
# is exactly the same as the tag under which the chart lives on ECR.
# Note that `+` character, although allowed in semver, is NOT allowed within tags on ECR.
chart_version=$image_tag
if [[ $cluster ]]; then
  chart_version=$chart_version-$cluster
fi
yq eval ".version = \"$chart_version\"" --inplace Chart.yaml

full_ecr_target_chart_id=$ecr_target_chart_repository:$chart_version

# Note that we need to use Helm v3.6 (or earlier),
# since Helm v3.7 (despite supposedly following semver) removed `helm chart` completely.
export HELM_EXPERIMENTAL_OCI=1  # needed to enable `helm chart` commands
helm chart save . "$full_ecr_target_chart_id"
helm chart push   "$full_ecr_target_chart_id"
