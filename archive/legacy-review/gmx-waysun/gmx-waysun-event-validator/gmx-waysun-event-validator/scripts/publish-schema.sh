#!/bin/bash
REGISTRY='localhost'

### Generated from: stella.dataapi.eventconfigurations.EventConfiguration

TOPIC="stella-messaging.default-event-definition"
RECORD_KEY='{\"type\":\"record\",\"name\":\"EventConfigurationKey\",\"namespace\":\"stella.dataapi.eventconfigurations\",\"fields\":[{\"name\":\"eventId\",\"type\":\"string\",\"logicalType\":\"uuid\"},{\"name\":\"projectId\",\"type\":\"string\",\"logicalType\":\"uuid\"},{\"name\":\"name\",\"type\":\"string\"}]}'
RECORD_VALUE='{\"type\":\"record\",\"name\":\"EventConfiguration\",\"namespace\":\"stella.dataapi.eventconfigurations\",\"fields\":[{\"name\":\"fields\",\"type\":{\"type\":\"array\",\"items\":{\"type\":\"record\",\"name\":\"EventField\",\"fields\":[{\"name\":\"name\",\"type\":\"string\"},{\"name\":\"valueType\",\"type\":\"string\"}]}}}]}'
DATA_KEY='{"schema": "'$RECORD_KEY'"}'
DATA_VALUE='{"schema": "'$RECORD_VALUE'"}'
HOST_KEY="http://$REGISTRY:8081/subjects/$TOPIC-key/versions"
HOST_VALUE="http://$REGISTRY:8081/subjects/$TOPIC-value/versions"
echo "curl -X POST -H \"Content-Type: application/vnd.schemaregistry.v1+json\" --data  '$DATA_KEY' $HOST_KEY"
echo "curl -X POST -H \"Content-Type: application/vnd.schemaregistry.v1+json\" --data  '$DATA_VALUE' $HOST_VALUE"

### Generated from: stella.dataapi.platformevents.EventEnvelope

TOPIC="stella-streaming.default-event-raw"
RECORD_KEY='{\"type\":\"record\",\"name\":\"EventKey\",\"namespace\":\"stella.dataapi.platformevents\",\"fields\":[{\"name\":\"projectId\",\"type\":\"string\",\"logicalType\":\"uuid\"},{\"name\":\"userId\",\"type\":\"string\"}]}'
RECORD_VALUE='{\"type\":\"record\",\"name\":\"EventEnvelope\",\"namespace\":\"stella.dataapi.platformevents\",\"fields\":[{\"name\":\"messageId\",\"type\":\"string\",\"logicalType\":\"uuid\"},{\"name\":\"messageOriginDateUTC\",\"type\":\"string\"},{\"name\":\"messageProcessingDateUTC\",\"type\":\"string\"},{\"name\":\"source\",\"type\":{\"type\":\"enum\",\"name\":\"Source\",\"symbols\":[\"external\",\"internal\"]}},{\"name\":\"eventName\",\"type\":\"string\"},{\"name\":\"payload\",\"type\":{\"type\":\"array\",\"items\":{\"type\":\"record\",\"name\":\"Field\",\"fields\":[{\"name\":\"name\",\"type\":\"string\"},{\"name\":\"value\",\"type\":\"string\"}]},\"default\":[]}}]}'
DATA_KEY='{"schema": "'$RECORD_KEY'"}'
DATA_VALUE='{"schema": "'$RECORD_VALUE'"}'
HOST_KEY="http://$REGISTRY:8081/subjects/$TOPIC-key/versions"
HOST_VALUE="http://$REGISTRY:8081/subjects/$TOPIC-value/versions"
echo "curl -X POST -H \"Content-Type: application/vnd.schemaregistry.v1+json\" --data  '$DATA_KEY' $HOST_KEY"
echo "curl -X POST -H \"Content-Type: application/vnd.schemaregistry.v1+json\" --data  '$DATA_VALUE' $HOST_VALUE"

### Generated from: stella.dataapi.platformevents.ValidatedEventEnvelope

TOPIC="v-streaming.default-event-validated"
RECORD_KEY='{\"type\":\"record\",\"name\":\"EventKey\",\"namespace\":\"stella.dataapi.platformevents\",\"fields\":[{\"name\":\"projectId\",\"type\":\"string\",\"logicalType\":\"uuid\"},{\"name\":\"userId\",\"type\":\"string\"}]}'
RECORD_VALUE='{\"type\":\"record\",\"name\":\"ValidatedEventEnvelope\",\"namespace\":\"stella.dataapi.platformevents\",\"fields\":[{\"name\":\"eventDefinitionId\",\"type\":\"string\",\"logicalType\":\"uuid\"},{\"name\":\"messageId\",\"type\":\"string\",\"logicalType\":\"uuid\"},{\"name\":\"messageOriginDateUTC\",\"type\":\"string\"},{\"name\":\"messageProcessingDateUTC\",\"type\":\"string\"},{\"name\":\"source\",\"type\":{\"type\":\"enum\",\"name\":\"Source\",\"symbols\":[\"external\",\"internal\"]}},{\"name\":\"eventName\",\"type\":\"string\"},{\"name\":\"payload\",\"type\":{\"type\":\"array\",\"items\":{\"type\":\"record\",\"name\":\"FieldTyped\",\"fields\":[{\"name\":\"name\",\"type\":\"string\"},{\"name\":\"value\",\"type\":\"string\"},{\"name\":\"type\",\"type\":\"string\"}]},\"default\":[]}}]}'
DATA_KEY='{"schema": "'$RECORD_KEY'"}'
DATA_VALUE='{"schema": "'$RECORD_VALUE'"}'
HOST_KEY="http://$REGISTRY:8081/subjects/$TOPIC-key/versions"
HOST_VALUE="http://$REGISTRY:8081/subjects/$TOPIC-value/versions"
echo "curl -X POST -H \"Content-Type: application/vnd.schemaregistry.v1+json\" --data  '$DATA_KEY' $HOST_KEY"
echo "curl -X POST -H \"Content-Type: application/vnd.schemaregistry.v1+json\" --data  '$DATA_VALUE' $HOST_VALUE"

### Generated from: stella.dataapi.platformevents.FailedEventEnvelope

TOPIC="stella-streaming.default-event-failed"
RECORD_KEY='{\"type\":\"record\",\"name\":\"EventKey\",\"namespace\":\"stella.dataapi.platformevents\",\"fields\":[{\"name\":\"projectId\",\"type\":\"string\",\"logicalType\":\"uuid\"},{\"name\":\"userId\",\"type\":\"string\"}]}'
RECORD_VALUE='{\"type\":\"record\",\"name\":\"FailedEventEnvelope\",\"namespace\":\"stella.dataapi.platformevents\",\"fields\":[{\"name\":\"failedValidation\",\"type\":{\"type\":\"array\",\"items\":{\"type\":\"record\",\"name\":\"FailedValidationMethods\",\"fields\":[{\"name\":\"validationName\",\"type\":\"string\"},{\"name\":\"description\",\"type\":\"string\"}]}}},{\"name\":\"eventEnvelope\",\"type\":{\"type\":\"record\",\"name\":\"EventEnvelope\",\"fields\":[{\"name\":\"messageId\",\"type\":\"string\",\"logicalType\":\"uuid\"},{\"name\":\"messageOriginDateUTC\",\"type\":\"string\"},{\"name\":\"messageProcessingDateUTC\",\"type\":\"string\"},{\"name\":\"source\",\"type\":{\"type\":\"enum\",\"name\":\"Source\",\"symbols\":[\"external\",\"internal\"]}},{\"name\":\"eventName\",\"type\":\"string\"},{\"name\":\"payload\",\"type\":{\"type\":\"array\",\"items\":{\"type\":\"record\",\"name\":\"Field\",\"fields\":[{\"name\":\"name\",\"type\":\"string\"},{\"name\":\"value\",\"type\":\"string\"}]},\"default\":[]}}]}}]}'
DATA_KEY='{"schema": "'$RECORD_KEY'"}'
DATA_VALUE='{"schema": "'$RECORD_VALUE'"}'
HOST_KEY="http://$REGISTRY:8081/subjects/$TOPIC-key/versions"
HOST_VALUE="http://$REGISTRY:8081/subjects/$TOPIC-value/versions"
echo "curl -X POST -H \"Content-Type: application/vnd.schemaregistry.v1+json\" --data  '$DATA_KEY' $HOST_KEY"
echo "curl -X POST -H \"Content-Type: application/vnd.schemaregistry.v1+json\" --data  '$DATA_VALUE' $HOST_VALUE"
