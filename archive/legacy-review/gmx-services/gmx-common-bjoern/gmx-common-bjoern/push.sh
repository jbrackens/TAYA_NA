#!/bin/sh

export AWS_PROFILE=flipsports
$(aws ecr get-login --no-include-email --region eu-west-1)

AWS_REST_DEFAULT=$(head -n1 Dockerfile | cut -d':' -f2)
BJOERN_VERSION=$(cat bjoern-requirements.txt | grep bjoern | cut -d'=' -f3)
TAG_NAME=${AWS_REST_DEFAULT}-${BJOERN_VERSION}

echo pushing version ${TAG_NAME}

docker push 259420793117.dkr.ecr.eu-west-1.amazonaws.com/gmx-common/bjoern:${TAG_NAME}
