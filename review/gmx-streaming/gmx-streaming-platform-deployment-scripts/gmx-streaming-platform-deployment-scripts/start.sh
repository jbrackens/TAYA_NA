#!/bin/bash
VERSION=$1
source $2

JAR="${GROUP_ID}-${ARTIFACT_ID}-${VERSION}.jar"

# get jar upload id
jarId=$(curl -X GET http://$FLINK_HOST/jars |  jq '.files[] | select(.name | contains("'$JAR'")) | .id' | sed 's/"//g')
# start all jobs
for entryClass in ${JOBS[@]} ; do curl -X POST -d  "{\"entryClass\" : \"$entryClass\"}" http://$FLINK_HOST/jars/$jarId/run ; done
