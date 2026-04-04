#!/bin/bash

VERSION=$1
source $2


# upload jar
curl -X POST -H "Expect:" -F "jarfile=@./${GROUP_ID}-${ARTIFACT_ID}-${VERSION}.jar" "http://$FLINK_HOST/jars/upload"

# clean
rm "./${GROUP_ID}-${ARTIFACT_ID}-${VERSION}.jar"