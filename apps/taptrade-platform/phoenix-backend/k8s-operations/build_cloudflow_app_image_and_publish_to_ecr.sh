#!/bin/bash

set -o xtrace

function show_usage() {
  echo "Usage:"
  echo "$(basename $0) <ecr-image-registry>"
  echo
  echo "Example:"
  echo "$(basename $0) 259420793117.dkr.ecr.eu-west-1.amazonaws.com"

  exit 1
}

set -e -o pipefail -u

if [ $# -ne 1 ]; then
  show_usage
fi

image_registry=$1
image_registry_suffix=${image_registry#*.ecr.}
aws_region=${image_registry_suffix%.amazonaws.com}

aws ecr get-login-password --region=${aws_region} \
  | docker login --username=AWS --password-stdin "$image_registry"

sbt -batch -Ddocker.repository="$image_registry" Cloudflow/buildApp
