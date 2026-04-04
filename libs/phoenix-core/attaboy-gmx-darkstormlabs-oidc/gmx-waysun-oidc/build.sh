#!/usr/bin/env bash
source ./common.sh $*

echo building version ${TAG_NAME}

docker build \
  -t gmx-darkstormlabs/oidc:latest \
  -t gmx-darkstormlabs/oidc:${TAG_NAME} \
  -t ${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com/gmx-darkstormlabs/oidc:${TAG_NAME} \
  -t registry.cn-beijing.aliyuncs.com/darkstormlabs-prod-namespace/darkstormlabs-prod-oidc-repo:${TAG_NAME} \
  -t registry.eu-central-1.aliyuncs.com/darkstormlabs-stage-namespace/gmx-darkstormlabs-oidc:${TAG_NAME} \
  --no-cache \
  --pull \
  .
