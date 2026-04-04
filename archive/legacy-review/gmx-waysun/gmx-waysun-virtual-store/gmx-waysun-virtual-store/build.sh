#!/usr/bin/env bash
source ./common.sh

echo building version ${TAG_NAME}

docker build \
  -t gmx-waysun/virtual-store:latest \
  -t gmx-waysun/virtual-store:${TAG_NAME} \
  -t ${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com/gmx-waysun/virtual-store:${TAG_NAME}  \
  -t registry.cn-beijing.aliyuncs.com/waysun-prod-namespace/waysun-prod-virtual-store-repo:${TAG_NAME} \
  -t registry.eu-central-1.aliyuncs.com/waysun-stage-namespace/gmx-waysun-virtual-store:${TAG_NAME} \
  --no-cache \
  --pull \
  .
