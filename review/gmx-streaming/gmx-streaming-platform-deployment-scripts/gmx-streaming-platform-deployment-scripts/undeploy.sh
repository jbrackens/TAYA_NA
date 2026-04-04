#!/bin/bash
export VERSION=$1
source $2

# remove all deployed jars
for item in $(curl http://$FLINK_HOST/jars | jq '.files[] | select(.name | contains("'${GROUP_ID}'-'${ARTIFACT_ID}'")) | .id' |sed "s/\"//g")
do
	curl -X DELETE http://$FLINK_HOST/jars/$item  2>&1
	echo "Deleted jobid $item"
done