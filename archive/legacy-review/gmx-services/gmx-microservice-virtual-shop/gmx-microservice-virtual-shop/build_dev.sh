#!/bin/sh

TAG_NAME=${1:-$(date +%Y%m%d_%H%M)}
echo building version ${TAG_NAME}

export AWS_PROFILE=flipsports
$(aws ecr get-login --no-include-email --region eu-west-1)
docker build --pull -t gmx-microservices/virtual_shop:${TAG_NAME} -t 259420793117.dkr.ecr.eu-west-1.amazonaws.com/gmx-microservices/virt-shop:${TAG_NAME}  --no-cache .
