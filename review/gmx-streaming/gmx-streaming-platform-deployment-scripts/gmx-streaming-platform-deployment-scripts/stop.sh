#!/bin/bash

source $2
# if job is one of maintained stop it
for item in $(curl -X GET http://${FLINK_HOST}/jobs | jq -r '.jobs | .[] | select(.status | contains("RUNNING")) | .id' |sed "s/\"//g")
do
	echo "Checking job id $item"
	jobName=$(curl -X GET http://$FLINK_HOST/jobs/$item | jq '.name' |sed "s/\"//g")
	echo "Checking $jobName"
	printf '%s ' "${JOBS_NAMES[@]}"
	if (printf '%s\n' "${JOBS_NAMES[@]}" | grep  "$jobName"); then
		jobId=$(curl -X GET http://$FLINK_HOST/jobs/$item | jq -r '.jid')
		echo "Job is running. Stoping it $jobId"
		curl -X PATCH http://$FLINK_HOST/jobs/$jobId 2>&1
		echo "Job is running. Stoping it $jobId"
	fi
done
