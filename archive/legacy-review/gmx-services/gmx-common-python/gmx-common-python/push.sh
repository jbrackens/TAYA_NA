#!/bin/sh

export AWS_PROFILE=flipsports
$(aws ecr get-login --no-include-email --region eu-west-1)
AWS_REST_DEFAULT=$(cat Dockerfile | grep aws-rest-default== | cut -d'=' -f3  | cut -d' ' -f1)
echo pushing version ${AWS_REST_DEFAULT}

docker push 259420793117.dkr.ecr.eu-west-1.amazonaws.com/gmx-common/python-36-alpine:3.9-${AWS_REST_DEFAULT}
