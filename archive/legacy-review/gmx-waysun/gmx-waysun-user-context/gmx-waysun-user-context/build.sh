#!/usr/bin/env bash
source ./common.sh $*

echo building version ${TAG_NAME}

docker build \
  -t gmx-waysun/user-context:latest \
  -t gmx-waysun/user-context:${TAG_NAME} \
  -t ${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com/gmx-waysun/user-context:${TAG_NAME} \
  -t registry.cn-beijing.aliyuncs.com/waysun-prod-namespace/waysun-user-context:${TAG_NAME} \
  -t registry.eu-central-1.aliyuncs.com/waysun-stage-namespace/gmx-waysun-user-context:${TAG_NAME} \
  --no-cache \
  --pull \
  .
