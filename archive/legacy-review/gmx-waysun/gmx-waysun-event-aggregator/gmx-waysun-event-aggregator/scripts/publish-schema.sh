#!/bin/bash
REGISTRY='localhost'

### Generated from: stella.dataapi.aggregation.AggregationResult

TOPIC="stella-streaming.default-aggregation-aggregated"
RECORD_KEY='{\"type\":\"record\",\"name\":\"AggregationResultKey\",\"namespace\":\"stella.dataapi.aggregation\",\"fields\":[{\"name\":\"aggregationRuleId\",\"type\":\"string\",\"logicalType\":\"uuid\"},{\"name\":\"projectId\",\"type\":\"string\",\"logicalType\":\"uuid\"},{\"name\":\"groupByFieldValue\",\"type\":[\"null\",\"string\"],\"default\":null}]}'
RECORD_VALUE='{\"type\":\"record\",\"name\":\"AggregationResult\",\"namespace\":\"stella.dataapi.aggregation\",\"fields\":[{\"name\":\"windowRangeStartUTC\",\"type\":[\"null\",\"long\"]},{\"name\":\"windowRangeEndUTC\",\"type\":[\"null\",\"long\"]},{\"name\":\"aggregations\",\"type\":{\"type\":\"record\",\"name\":\"AggregationValues\",\"fields\":[{\"name\":\"min\",\"type\":\"float\"},{\"name\":\"max\",\"type\":\"float\"},{\"name\":\"count\",\"type\":\"int\"},{\"name\":\"sum\",\"type\":\"float\"},{\"name\":\"custom\",\"type\":\"string\"}]}}]}'
DATA_KEY='{"schema": "'$RECORD_KEY'"}'
DATA_VALUE='{"schema": "'$RECORD_VALUE'"}'
HOST_KEY="http://$REGISTRY:8081/subjects/$TOPIC-key/versions"
HOST_VALUE="http://$REGISTRY:8081/subjects/$TOPIC-value/versions"
echo "curl -X POST -H \"Content-Type: application/vnd.schemaregistry.v1+json\" --data  '$DATA_KEY' $HOST_KEY"
echo "curl -X POST -H \"Content-Type: application/vnd.schemaregistry.v1+json\" --data  '$DATA_VALUE' $HOST_VALUE"

### Generated from: stella.dataapi.aggregation.AggregationRuleConfiguration

TOPIC="stella-messaging.default-aggregation-definition"
RECORD_KEY='{\"type\":\"record\",\"name\":\"AggregationRuleConfigurationKey\",\"namespace\":\"stella.dataapi.aggregation\",\"fields\":[{\"name\":\"ruleId\",\"type\":\"string\",\"logicalType\":\"uuid\"},{\"name\":\"projectId\",\"type\":\"string\",\"logicalType\":\"uuid\"},{\"name\":\"name\",\"type\":\"string\"},{\"name\":\"eventId\",\"type\":\"string\",\"logicalType\":\"uuid\"}]}'
RECORD_VALUE='{\"type\":\"record\",\"name\":\"AggregationRuleConfiguration\",\"namespace\":\"stella.dataapi.aggregation\",\"fields\":[{\"name\":\"aggregationFieldName\",\"type\":\"string\"},{\"name\":\"aggregationGroupByFieldName\",\"type\":[\"null\",\"string\"],\"default\":null},{\"name\":\"resetFrequency\",\"type\":{\"type\":\"record\",\"name\":\"AggregationInterval\",\"fields\":[{\"name\":\"intervalType\",\"type\":{\"type\":\"enum\",\"name\":\"IntervalType\",\"symbols\":[\"MINUTES\",\"HOURS\",\"DAYS\",\"MONTHS\",\"NEVER\"]}},{\"name\":\"windowStartDateUTC\",\"type\":\"long\"},{\"name\":\"intervalDetails\",\"type\":[\"null\",{\"type\":\"record\",\"name\":\"IntervalDetails\",\"fields\":[{\"name\":\"length\",\"type\":\"int\"},{\"name\":\"windowCountLimit\",\"type\":[\"null\",\"int\"],\"default\":null}]}]}]}},{\"name\":\"aggregationConditions\",\"type\":{\"type\":\"array\",\"items\":{\"type\":\"record\",\"name\":\"AggregationCondition\",\"fields\":[{\"name\":\"eventFieldName\",\"type\":\"string\"},{\"name\":\"conditionType\",\"type\":{\"type\":\"enum\",\"name\":\"ConditionType\",\"symbols\":[\"EQ\",\"NEQ\",\"LT\",\"LE\",\"GT\",\"GE\",\"NN\"]}},{\"name\":\"value\",\"type\":[\"null\",\"string\"],\"default\":null}]}}},{\"name\":\"aggregationType\",\"type\":{\"type\":\"enum\",\"name\":\"AggregationType\",\"symbols\":[\"SUM\",\"MIN\",\"MAX\",\"COUNT\"]}}]}'
DATA_KEY='{"schema": "'$RECORD_KEY'"}'
DATA_VALUE='{"schema": "'$RECORD_VALUE'"}'
HOST_KEY="http://$REGISTRY:8081/subjects/$TOPIC-key/versions"
HOST_VALUE="http://$REGISTRY:8081/subjects/$TOPIC-value/versions"
echo "curl -X POST -H \"Content-Type: application/vnd.schemaregistry.v1+json\" --data  '$DATA_KEY' $HOST_KEY"
echo "curl -X POST -H \"Content-Type: application/vnd.schemaregistry.v1+json\" --data  '$DATA_VALUE' $HOST_VALUE"
