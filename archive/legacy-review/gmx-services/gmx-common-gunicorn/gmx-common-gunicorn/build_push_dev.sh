#!/bin/sh
set -e
AWS_REST_DEFAULT=$(head -n1 Dockerfile | cut -d':' -f2)
GUNICORN_VERSION=$(cat gunicorn-requirements.txt | grep gunicorn | cut -d'=' -f3)
TAG_NAME=${AWS_REST_DEFAULT}-${GUNICORN_VERSION}

docker build --pull -t gmx-common/gunicorn:${TAG_NAME} -t 259420793117.dkr.ecr.eu-west-1.amazonaws.com/gmx-common/gunicorn:${TAG_NAME} --no-cache .

echo pushing version ${TAG_NAME}

export AWS_PROFILE=flipsports
$(aws ecr get-login --no-include-email --region eu-west-1)
docker push 259420793117.dkr.ecr.eu-west-1.amazonaws.com/gmx-common/gunicorn:${TAG_NAME}
