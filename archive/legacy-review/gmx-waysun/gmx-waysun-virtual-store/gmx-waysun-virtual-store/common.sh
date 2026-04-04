#!/usr/bin/env bash
set -e
PIPENV_LOCK_REFRESHED=${PIPENV_LOCK_REFRESHED:-FALSE}

if [[ ${PIPENV_LOCK_REFRESHED} != "TRUE" ]]; then
  pipenv lock --clear
  export PIPENV_LOCK_REFRESHED=TRUE
fi

AWS_REST_DEFAULT=$(pipenv graph | grep aws-rest-default | cut -d'=' -f3 | sed s/+/-/)
TAG_NAME=${1:-$(date +%Y%m%d_%H%M)}

AWS_REGION=${AWS_REGION:-eu-west-1}
AWS_ACCOUNT_ID=${AWS_ACCOUNT_ID:-259420793117}
export AWS_PROFILE=flipsports
aws --region ${AWS_REGION} ecr get-login-password \
    |  docker login \
        --password-stdin \
        --username AWS \
        "${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com"