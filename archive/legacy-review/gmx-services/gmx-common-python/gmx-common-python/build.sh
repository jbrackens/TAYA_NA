#!/bin/sh
set -ex
AWS_REST_DEFAULT=$(cat Dockerfile | grep aws-rest-default== | cut -d'=' -f3  | cut -d' ' -f1)
echo building version ${AWS_REST_DEFAULT}

docker build  \
  -t gmx-common/python-36-stretch:3.7-${AWS_REST_DEFAULT} \
  -t gmx-common/python:3.7.6-${AWS_REST_DEFAULT} \
  -t 259420793117.dkr.ecr.eu-west-1.amazonaws.com/gmx-common/python-36-stretch:3.7-${AWS_REST_DEFAULT} \
  -t 259420793117.dkr.ecr.eu-west-1.amazonaws.com/gmx-common/python:3.7.6-${AWS_REST_DEFAULT} \
  --no-cache \
  --pull \
  .
