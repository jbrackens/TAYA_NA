#!/bin/sh
set -e
TAG_NAME=${1:-$(date +%Y%m%d_%H%M)}
echo building version ${TAG_NAME}

AWS_REGION=${AWS_REGION:-eu-west-1}
AWS_ACCOUNT_D=${AWS_ACCOUNT_D:-259420793117}
export AWS_PROFILE=flipsports
aws --region ${AWS_REGION} ecr get-login-password \
    |  docker login \
        --password-stdin \
        --username AWS \
        "${AWS_ACCOUNT_D}.dkr.ecr.${AWS_REGION}.amazonaws.com"
docker build --pull -t gmx-microservices/wallet:${TAG_NAME} -t 259420793117.dkr.ecr.eu-west-1.amazonaws.com/gmx-microservices/wallet:${TAG_NAME}  --no-cache .
