#!/bin/bash

# NOTE: We redirect all output to 'build.log' and stderr; only the final image tag goes to stdout
# This is to make it easier to pipe the final image tag to other commands
# But we still have the output logged to a file for debugging

if [ $# -ne 2 ]; then
  echo "Usage:"
  echo "$(basename $0) <ecr-image-registry> <image-tag>"
  echo
  echo "Example:"
  echo "$(basename $0) 259420793117.dkr.ecr.eu-west-1.amazonaws.com 12ab34c"

  exit 1
fi

set -e -o pipefail -u

image_registry=$1
module_name=app-darkstormlabs
image_tag=$2

image_registry_suffix=${image_registry#*.ecr.}
aws_region=${image_registry_suffix%.amazonaws.com}

# Note that we avoid using `latest` tag for local images to prevent race conditions in Jenkins.
# Since all builds share the same underlying Docker context, it is possible that between the execution of `dockerize.sh`
# and tagging the local image, `latest` will already correspond to a different Docker image.
# This is a potentially huge problem for the correctness of `remote_fixed_image_id`.
local_image_id=phoenix-ui/$module_name:$image_tag
remote_fixed_image_id=$image_registry/phoenix-ui-$module_name:$image_tag

{
  echo
  echo "----"
  echo "$(date -u) [$0 ${module_name}]:"

  aws ecr get-login-password --region=${aws_region} \
    | docker login --username=AWS --password-stdin "$image_registry"

  ./docker/dockerize.sh "$module_name" "$image_tag"

  docker tag $local_image_id $remote_fixed_image_id
  docker push                $remote_fixed_image_id
} 2>&1 | tee -a k8s-operations/build.log 1>&2

echo $image_tag
