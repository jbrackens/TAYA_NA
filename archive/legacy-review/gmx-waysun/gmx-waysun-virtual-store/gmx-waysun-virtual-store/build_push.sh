#!/usr/bin/env bash
source ./common.sh $*

./build.sh ${TAG_NAME}

echo pushing version ${TAG_NAME}
docker push ${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com/gmx-waysun/virtual-store:${TAG_NAME}
docker login registry.cn-beijing.aliyuncs.com
docker push registry.cn-beijing.aliyuncs.com/waysun-prod-namespace/waysun-prod-virtual-store-repo:${TAG_NAME}
docker login  registry.eu-central-1.aliyuncs.com
docker push registry.eu-central-1.aliyuncs.com/waysun-stage-namespace/gmx-waysun-virtual-store:${TAG_NAME}
