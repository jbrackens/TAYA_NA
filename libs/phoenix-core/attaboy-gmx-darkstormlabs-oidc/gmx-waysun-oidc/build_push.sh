#!/usr/bin/env bash
source ./common.sh $*

./build.sh ${TAG_NAME}

echo pushing version ${TAG_NAME}
docker push ${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com/gmx-darkstormlabs/oidc:${TAG_NAME}
docker login registry.cn-beijing.aliyuncs.com
docker login registry.eu-central-1.aliyuncs.com
docker push registry.cn-beijing.aliyuncs.com/darkstormlabs-prod-namespace/darkstormlabs-prod-oidc-repo:${TAG_NAME}
docker push registry.eu-central-1.aliyuncs.com/darkstormlabs-stage-namespace/gmx-darkstormlabs-oidc:${TAG_NAME}
