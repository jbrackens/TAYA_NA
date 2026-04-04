#!/bin/bash -e
export DOCKER_URI=${DOCKER_URI:-"127.0.0.1:5001/$GIT_REPOSITORY:latest"}

git checkout -f
pushd $GIT_WORK_TREE
$(dirname $0)/slack.sh "Server: $(hostname)" "*$GIT_REPOSITORY* was updated to a new revision by *$(whoami)*" "[{ 'title':'revision', 'value': '$(git rev-parse --verify HEAD)', 'short': false }]"

docker build -t $DOCKER_URI $GIT_WORK_TREE
docker push $DOCKER_URI

$(dirname $0)/slack.sh "Server: $(hostname)" "*$GIT_REPOSITORY* was successfully built"
popd
