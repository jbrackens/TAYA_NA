#!/bin/bash -e
export GSTECH_DEPLOY="/data/git/gstech-deploy"

pushd $GSTECH_DEPLOY

# git pull # this does not work for some reason. maybe it would even better to push "deploy" module as any other module
docker stack deploy -c $1.yml $1

$(dirname $0)/slack.sh "Server: $(hostname)" "*$GIT_REPOSITORY* was successfully deployed"
popd
