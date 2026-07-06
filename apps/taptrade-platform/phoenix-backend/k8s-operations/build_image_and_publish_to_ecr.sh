#!/bin/bash

# NOTE: We redirect all output to 'build.log' and stderr; only the final image tag goes to stdout
# This is to make it easier to pipe the final image name to other commands
# But we still have the output logged to a file for debugging

function show_usage() {
  echo "Usage:"
  echo "$(basename $0) <ecr-image-registry> <sbt-module-name>"
  echo
  echo "Example:"
  echo "$(basename $0) 259420793117.dkr.ecr.eu-west-1.amazonaws.com phoenix-backend"
  echo
  echo "Note that sbt-native-packager is used for building the Docker image.".

  exit 1
}

set -e -o pipefail -u

if [ $# -ne 2 ]; then
  show_usage
fi

image_registry=$1
module_name=$2

image_registry_suffix=${image_registry#*.ecr.}
aws_region=${image_registry_suffix%.amazonaws.com}

aws ecr get-login-password --region=${aws_region} \
  | docker login --username=AWS --password-stdin "$image_registry"

sbt -Ddocker.repository="${image_registry}" $module_name/Docker/publish
