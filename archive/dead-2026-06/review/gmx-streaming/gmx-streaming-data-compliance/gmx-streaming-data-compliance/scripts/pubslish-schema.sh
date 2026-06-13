#!/bin/bash
REGISTRY='localhost'
RECORD_KEY='{\"type\":\"record\",\"name\":\"ComplianceCustomerId\",\"namespace\":\"net.flipsports.gmx.dataapi.internal.compliance.validation\",\"fields\":[{\"name\":\"externalUserId\",\"type\":\"string\"}]}'
RECORD_VALUE='{\"type\":\"record\",\"name\":\"ValidationCheck\",\"namespace\":\"net.flipsports.gmx.dataapi.internal.compliance.validation\",\"fields\":[{\"name\":\"uuid\",\"type\":\"string\",\"logicalType\":\"UUID\"},{\"name\":\"createdDateUTC\",\"type\":[\"null\",\"long\"],\"default\":null},{\"name\":\"companyId\",\"type\":[\"null\",\"string\"],\"default\":null,\"logicalType\":\"UUID\"},{\"name\":\"externalUserId\",\"type\":\"string\"},{\"name\":\"userId\",\"type\":[\"null\",\"string\"],\"default\":null},{\"name\":\"email\",\"type\":[\"null\",\"string\"],\"default\":null},{\"name\":\"operationTrigger\",\"type\":[\"null\",\"string\"],\"default\":null},{\"name\":\"sourceMessage\",\"type\":[\"null\",\"string\"],\"default\":null}]}'
DATA_KEY='{"schema": "'$RECORD_KEY'"}'
DATA_VALUE='{"schema": "'$RECORD_VALUE'"}'
HOST_KEY="http://$REGISTRY:8081/subjects/gmx-messaging.sportnation-compliance-validation-key/versions"
HOST_VALUE="http://$REGISTRY:8081/subjects/gmx-messaging.sportnation-compliance-validation-value/versions"

echo "curl -X POST -H \"Content-Type: application/vnd.schemaregistry.v1+json\" --data  '$DATA_KEY' $HOST_KEY"
echo "curl -X POST -H \"Content-Type: application/vnd.schemaregistry.v1+json\" --data  '$DATA_VALUE' $HOST_VALUE"

REGISTRY='localhost'
RECORD_KEY='{\"type\":\"record\",\"name\":\"ComplianceCustomerId\",\"namespace\":\"net.flipsports.gmx.dataapi.internal.compliance.validation\",\"fields\":[{\"name\":\"externalUserId\",\"type\":\"string\"}]}'
RECORD_VALUE='{\"type\":\"record\",\"name\":\"ValidationCheck\",\"namespace\":\"net.flipsports.gmx.dataapi.internal.compliance.validation\",\"fields\":[{\"name\":\"uuid\",\"type\":\"string\",\"logicalType\":\"UUID\"},{\"name\":\"createdDateUTC\",\"type\":[\"null\",\"long\"],\"default\":null},{\"name\":\"companyId\",\"type\":[\"null\",\"string\"],\"default\":null,\"logicalType\":\"UUID\"},{\"name\":\"externalUserId\",\"type\":\"string\"},{\"name\":\"userId\",\"type\":[\"null\",\"string\"],\"default\":null},{\"name\":\"email\",\"type\":[\"null\",\"string\"],\"default\":null},{\"name\":\"operationTrigger\",\"type\":[\"null\",\"string\"],\"default\":null},{\"name\":\"sourceMessage\",\"type\":[\"null\",\"string\"],\"default\":null}]}'
DATA_KEY='{"schema": "'$RECORD_KEY'"}'
DATA_VALUE='{"schema": "'$RECORD_VALUE'"}'
HOST_KEY="http://$REGISTRY:8081/subjects/gmx-messaging.redzone-compliance-validation-key/versions"
HOST_VALUE="http://$REGISTRY:8081/subjects/gmx-messaging.redzone-compliance-validation-value/versions"

echo "curl -X POST -H \"Content-Type: application/vnd.schemaregistry.v1+json\" --data  '$DATA_KEY' $HOST_KEY"
echo "curl -X POST -H \"Content-Type: application/vnd.schemaregistry.v1+json\" --data  '$DATA_VALUE' $HOST_VALUE"


REGISTRY='localhost'
RECORD_KEY='{\"type\":\"record\",\"name\":\"ComplianceCustomerId\",\"namespace\":\"net.flipsports.gmx.dataapi.internal.compliance.validation\",\"fields\":[{\"name\":\"externalUserId\",\"type\":\"string\"}]}'
RECORD_VALUE='{\"type\":\"record\",\"name\":\"ValidationCheck\",\"namespace\":\"net.flipsports.gmx.dataapi.internal.compliance.validation\",\"fields\":[{\"name\":\"uuid\",\"type\":\"string\",\"logicalType\":\"UUID\"},{\"name\":\"createdDateUTC\",\"type\":[\"null\",\"long\"],\"default\":null},{\"name\":\"companyId\",\"type\":[\"null\",\"string\"],\"default\":null,\"logicalType\":\"UUID\"},{\"name\":\"externalUserId\",\"type\":\"string\"},{\"name\":\"userId\",\"type\":[\"null\",\"string\"],\"default\":null},{\"name\":\"email\",\"type\":[\"null\",\"string\"],\"default\":null},{\"name\":\"operationTrigger\",\"type\":[\"null\",\"string\"],\"default\":null},{\"name\":\"sourceMessage\",\"type\":[\"null\",\"string\"],\"default\":null}]}'
DATA_KEY='{"schema": "'$RECORD_KEY'"}'
DATA_VALUE='{"schema": "'$RECORD_VALUE'"}'
HOST_KEY="http://$REGISTRY:8081/subjects/gmx-messaging.fansbetuk-compliance-validation-key/versions"
HOST_VALUE="http://$REGISTRY:8081/subjects/gmx-messaging.fansbetuk-compliance-validation-value/versions"

echo "curl -X POST -H \"Content-Type: application/vnd.schemaregistry.v1+json\" --data  '$DATA_KEY' $HOST_KEY"
echo "curl -X POST -H \"Content-Type: application/vnd.schemaregistry.v1+json\" --data  '$DATA_VALUE' $HOST_VALUE"