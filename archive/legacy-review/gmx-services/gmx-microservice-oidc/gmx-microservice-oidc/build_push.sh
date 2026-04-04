#!/bin/sh

TAG_NAME=${1:-$(date +%Y%m%d_%H%M)}

./build.sh ${TAG_NAME}

echo pushing version ${TAG_NAME}

export AWS_PROFILE=flipsports
$(aws ecr get-login --no-include-email --region eu-west-1)
docker push 259420793117.dkr.ecr.eu-west-1.amazonaws.com/gmx-microservice/base:${TAG_NAME}

