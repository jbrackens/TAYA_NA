#!/bin/bash
REGISTRY='localhost'

### Generated from: net.eeg.gmx.dataapi.internal.systemnotification.SystemNotification

TOPIC="eeg-technical.sportnation-system-notification"
RECORD_KEY='{\"type\":\"record\",\"name\":\"SystemNotificationId\",\"namespace\":\"net.eeg.gmx.dataapi.internal.systemnotification\",\"fields\":[{\"name\":\"externalUserId\",\"type\":\"string\"}]}'
RECORD_VALUE='{\"type\":\"record\",\"name\":\"SystemNotification\",\"namespace\":\"net.eeg.gmx.dataapi.internal.systemnotification\",\"fields\":[{\"name\":\"uuid\",\"type\":\"string\",\"logicalType\":\"UUID\"},{\"name\":\"createdDateUTC\",\"type\":[\"null\",\"long\"],\"default\":null},{\"name\":\"companyId\",\"type\":[\"null\",\"string\"],\"default\":null,\"logicalType\":\"UUID\"},{\"name\":\"externalUserId\",\"type\":\"string\"},{\"name\":\"userId\",\"type\":[\"null\",\"string\"],\"default\":null},{\"name\":\"email\",\"type\":[\"null\",\"string\"],\"default\":null},{\"name\":\"status\",\"type\":[\"null\",\"string\"],\"default\":null},{\"name\":\"action\",\"type\":[\"null\",{\"type\":\"enum\",\"name\":\"ActionType\",\"symbols\":[\"START_OVER_AGAIN\",\"VERIFY_CUSTOMER\",\"DECLINE_CUSTOMER\"]}]}]}'
DATA_KEY='{"schema": "'$RECORD_KEY'"}'
DATA_VALUE='{"schema": "'$RECORD_VALUE'"}'
HOST_KEY="http://$REGISTRY:8081/subjects/$TOPIC-key/versions"
HOST_VALUE="http://$REGISTRY:8081/subjects/$TOPIC-value/versions"
echo "curl -X POST -H \"Content-Type: application/vnd.schemaregistry.v1+json\" --data  '$DATA_KEY' $HOST_KEY"
echo "curl -X POST -H \"Content-Type: application/vnd.schemaregistry.v1+json\" --data  '$DATA_VALUE' $HOST_VALUE"
