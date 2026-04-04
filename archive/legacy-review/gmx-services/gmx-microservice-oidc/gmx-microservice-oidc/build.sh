#!/bin/sh

TAG_NAME=${1:-$(date +%Y%m%d_%H%M)}
echo building version ${TAG_NAME}

docker build -t gmx-microservice/base:${TAG_NAME} -t 259420793117.dkr.ecr.eu-west-1.amazonaws.com/gmx-microservice/base:${TAG_NAME}  --no-cache .
