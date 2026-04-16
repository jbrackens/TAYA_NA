#!/bin/bash

if [[ $# -lt 1 ]] || [[ $# -gt 2 ]]; then
  echo "Usage:"
  echo "$(basename $0) <module> [<image-tag>]"
  echo
  echo "Examples:"
  echo "$(basename $0) app-darkstormlabs 12ab34c"

  exit 1
fi

set -e -o pipefail -u

module_name=$1
image_tag=${2-latest}

DOCKER_BUILDKIT=1 docker build \
  --build-arg module_name=$module_name \
  -f ./docker/frontend.Dockerfile \
  --progress=plain \
  --secret id=npmrc,src=$HOME/.npmrc \
  -t phoenix-ui/$module_name:$image_tag \
  .
