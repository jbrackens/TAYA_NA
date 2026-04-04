# Flink Deployment scripts!
Apache Flink Deployment Scripts.

* Need to pass file with properties - see  `template.properties` *

* WARNING * Main assumption is that, You are deploying all jobs correlated to given artifact if you want perform partial deployment you should skip "undeploy step"

Shared as subbmodule accross all flink jobs

All scripts requires same parameters PARAM1 and PARAM2
- PARAM1 -> its vesion number like: 0.0.1 *must be maven compatible*
- PARAM2 -> its deployment properties directory (copied from template.properties) and renamed to application.properties

- script prefix "./deployment/flink-deployment" path to submodule

## Stop jobs

./deployment/flink-deployment/stop.sh 0.0.1 dev.properties

## Undeploy all existing jobs in given project

./undeploy.sh 0.0.1 dev.properties

## Download artifact

./download.sh 0.0.1 dev.properties

## Upload new artifact

./upload.sh 0.0.1 dev.properties

## Startup startup all managed jobs

./start.sh 0.0.1 ./dev.properties
