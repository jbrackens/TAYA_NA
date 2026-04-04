#!/bin/sh

AWS_REGION=${AWS_REGION:-eu-west-1}
AWS_ACCOUNT_D=${AWS_ACCOUNT_D:-259420793117}
export AWS_PROFILE=flipsports
aws --region ${AWS_REGION} ecr get-login-password \
    |  docker login \
        --password-stdin \
        --username AWS \
        "${AWS_ACCOUNT_D}.dkr.ecr.${AWS_REGION}.amazonaws.com"

AWS_REST_DEFAULT=$(head -n1 Dockerfile | cut -d':' -f2)
GUNICORN_VERSION=$(cat gunicorn-requirements.txt | grep gunicorn | cut -d'=' -f3)
TAG_NAME=${AWS_REST_DEFAULT}-${GUNICORN_VERSION}

echo pushing version ${TAG_NAME}

docker push 259420793117.dkr.ecr.eu-west-1.amazonaws.com/gmx-common/gunicorn:${TAG_NAME}
