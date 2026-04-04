#!/bin/sh

AWS_REST_DEFAULT=$(head -n1 Dockerfile | cut -d':' -f2)
BJOERN_VERSION=$(cat bjoern-requirements.txt | grep bjoern | cut -d'=' -f3)
TAG_NAME=${AWS_REST_DEFAULT}-${BJOERN_VERSION}

docker build -t gmx-common/bjoern:${TAG_NAME} -t 259420793117.dkr.ecr.eu-west-1.amazonaws.com/gmx-common/bjoern:${TAG_NAME} --no-cache .
