#!/bin/sh

set -e
AWS_REST_DEFAULT=$(cat Dockerfile | grep aws-rest-default== | cut -d'=' -f3 | cut -d' ' -f1)
TAG=3.7.6-${AWS_REST_DEFAULT}

TAG=${1:-$TAG}
echo building version ${TAG}

docker build --pull -t gmx-common/python:${TAG} -t 259420793117.dkr.ecr.eu-west-1.amazonaws.com/gmx-common/python:${TAG} --no-cache .
