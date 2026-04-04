#!/bin/bash
source $1/version.sh

bash $DEPLOYMENT/download.sh $VERSION $ENV_PATH
bash $DEPLOYMENT/stop.sh $VERSION $ENV_PATH
bash $DEPLOYMENT/undeploy.sh $VERSION $ENV_PATH
bash $DEPLOYMENT/upload.sh $VERSION $ENV_PATH
bash $DEPLOYMENT/start.sh $VERSION $ENV_PATH
