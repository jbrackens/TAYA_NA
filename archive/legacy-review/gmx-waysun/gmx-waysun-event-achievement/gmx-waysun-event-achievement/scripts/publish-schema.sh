#!/bin/bash
REGISTRY='localhost'

### Generated from: stella.dataapi.achievement.AchievementConfiguration

TOPIC="stella-messaging.default-achievement-definition"
RECORD_KEY='{\"type\":\"record\",\"name\":\"AchievementConfigurationKey\",\"namespace\":\"stella.dataapi.achievement\",\"fields\":[{\"name\":\"achievementRuleId\",\"type\":\"string\",\"logicalType\":\"uuid\"},{\"name\":\"projectId\",\"type\":\"string\",\"logicalType\":\"uuid\"}]}'
RECORD_VALUE='{\"type\":\"record\",\"name\":\"AchievementConfiguration\",\"namespace\":\"stella.dataapi.achievement\",\"fields\":[{\"name\":\"name\",\"type\":\"string\"},{\"name\":\"triggerBehaviour\",\"type\":{\"type\":\"enum\",\"name\":\"AchievementTriggerBehaviour\",\"symbols\":[\"ALWAYS\",\"ONLY_ONCE\"],\"default\":\"ONLY_ONCE\"}},{\"name\":\"actionType\",\"type\":{\"type\":\"enum\",\"name\":\"ActionType\",\"symbols\":[\"EVENT\",\"WEBHOOK\"]}},{\"name\":\"webhookConfiguration\",\"type\":[\"null\",{\"type\":\"record\",\"name\":\"WebhookConfiguration\",\"fields\":[{\"name\":\"requestType\",\"type\":{\"type\":\"enum\",\"name\":\"RequestType\",\"symbols\":[\"GET\",\"POST\",\"PUT\",\"PATCH\",\"DELETE\"]}},{\"name\":\"url\",\"type\":\"string\"},{\"name\":\"webhookEventConfiguration\",\"type\":[\"null\",{\"type\":\"record\",\"name\":\"WebhookEventConfiguration\",\"fields\":[{\"name\":\"eventId\",\"type\":\"string\",\"logicalType\":\"uuid\"},{\"name\":\"fields\",\"type\":{\"type\":\"array\",\"items\":{\"type\":\"record\",\"name\":\"EventFieldConfiguration\",\"fields\":[{\"name\":\"fieldName\",\"type\":\"string\"},{\"name\":\"operationType\",\"type\":{\"type\":\"enum\",\"name\":\"OperationType\",\"symbols\":[\"REPLACE_FROM\",\"STATIC\"]}},{\"name\":\"aggregationRuleId\",\"type\":[\"null\",\"string\"],\"logicalType\":\"uuid\"},{\"name\":\"value\",\"type\":\"string\"}]}}}]}]}]}]},{\"name\":\"eventConfiguration\",\"type\":[\"null\",{\"type\":\"record\",\"name\":\"EventConfiguration\",\"fields\":[{\"name\":\"eventId\",\"type\":\"string\",\"logicalType\":\"uuid\"},{\"name\":\"fields\",\"type\":{\"type\":\"array\",\"items\":\"EventFieldConfiguration\"}}]}]},{\"name\":\"conditions\",\"type\":{\"type\":\"array\",\"items\":{\"type\":\"record\",\"name\":\"AchievementCondition\",\"fields\":[{\"name\":\"aggregationRuleId\",\"type\":\"string\",\"logicalType\":\"uuid\"},{\"name\":\"aggregationField\",\"type\":\"string\"},{\"name\":\"conditionType\",\"type\":{\"type\":\"enum\",\"name\":\"ConditionType\",\"symbols\":[\"EQ\",\"NEQ\",\"LT\",\"LE\",\"GT\",\"GE\",\"NN\"]}},{\"name\":\"value\",\"type\":[\"null\",\"string\"],\"default\":null}]}}}]}'
DATA_KEY='{"schema": "'$RECORD_KEY'"}'
DATA_VALUE='{"schema": "'$RECORD_VALUE'"}'
HOST_KEY="http://$REGISTRY:8081/subjects/$TOPIC-key/versions"
HOST_VALUE="http://$REGISTRY:8081/subjects/$TOPIC-value/versions"
echo "curl -X POST -H \"Content-Type: application/vnd.schemaregistry.v1+json\" --data  '$DATA_KEY' $HOST_KEY"
echo "curl -X POST -H \"Content-Type: application/vnd.schemaregistry.v1+json\" --data  '$DATA_VALUE' $HOST_VALUE"

### Generated from: stella.dataapi.aggregation.AggregationResultKey

TOPIC="stella-streaming.default-aggregation-aggregated"
RECORD_KEY='{\"type\":\"record\",\"name\":\"AggregationResult\",\"namespace\":\"stella.dataapi.aggregation\",\"fields\":[{\"name\":\"windowRangeStartUTC\",\"type\":[\"null\",\"long\"]},{\"name\":\"windowRangeEndUTC\",\"type\":[\"null\",\"long\"]},{\"name\":\"aggregations\",\"type\":{\"type\":\"record\",\"name\":\"AggregationValues\",\"fields\":[{\"name\":\"min\",\"type\":\"float\"},{\"name\":\"max\",\"type\":\"float\"},{\"name\":\"count\",\"type\":\"int\"},{\"name\":\"sum\",\"type\":\"float\"},{\"name\":\"custom\",\"type\":\"string\"}]}}]}'
RECORD_VALUE='{\"type\":\"record\",\"name\":\"AggregationResultKey\",\"namespace\":\"stella.dataapi.aggregation\",\"fields\":[{\"name\":\"aggregationRuleId\",\"type\":\"string\",\"logicalType\":\"uuid\"},{\"name\":\"projectId\",\"type\":\"string\",\"logicalType\":\"uuid\"},{\"name\":\"groupByFieldValue\",\"type\":[\"null\",\"string\"],\"default\":null}]}'
DATA_KEY='{"schema": "'$RECORD_KEY'"}'
DATA_VALUE='{"schema": "'$RECORD_VALUE'"}'
HOST_KEY="http://$REGISTRY:8081/subjects/$TOPIC-key/versions"
HOST_VALUE="http://$REGISTRY:8081/subjects/$TOPIC-value/versions"
echo "curl -X POST -H \"Content-Type: application/vnd.schemaregistry.v1+json\" --data  '$DATA_KEY' $HOST_KEY"
echo "curl -X POST -H \"Content-Type: application/vnd.schemaregistry.v1+json\" --data  '$DATA_VALUE' $HOST_VALUE"

### Generated from: stella.dataapi.achievement.event.AchievementEvent

TOPIC="stella-streaming.default-achievement-achievement"
RECORD_KEY='{\"type\":\"record\",\"name\":\"AchievementEventKey\",\"namespace\":\"stella.dataapi.achievement.event\",\"fields\":[{\"name\":\"achievementEventId\",\"type\":\"string\",\"logicalType\":\"uuid\"},{\"name\":\"achievementRuleId\",\"type\":\"string\",\"logicalType\":\"uuid\"},{\"name\":\"projectId\",\"type\":\"string\",\"logicalType\":\"uuid\"}]}'
RECORD_VALUE='{\"type\":\"record\",\"name\":\"AchievementEvent\",\"namespace\":\"stella.dataapi.achievement.event\",\"fields\":[{\"name\":\"projectId\",\"type\":\"string\",\"logicalType\":\"uuid\"},{\"name\":\"messageOriginDateUTC\",\"type\":\"long\"},{\"name\":\"groupByFieldValue\",\"type\":[\"null\",\"string\"]},{\"name\":\"actionType\",\"type\":{\"type\":\"enum\",\"name\":\"ActionType\",\"symbols\":[\"EVENT\",\"WEBHOOK\"]}},{\"name\":\"webhookDetails\",\"type\":[\"null\",{\"type\":\"record\",\"name\":\"WebhookDetails\",\"fields\":[{\"name\":\"requestType\",\"type\":{\"type\":\"enum\",\"name\":\"RequestType\",\"symbols\":[\"GET\",\"POST\",\"PUT\",\"PATCH\",\"DELETE\"]}},{\"name\":\"url\",\"type\":\"string\"},{\"name\":\"webhookEventDetails\",\"type\":[\"null\",{\"type\":\"record\",\"name\":\"WebhookEventDetails\",\"fields\":[{\"name\":\"eventId\",\"type\":\"string\",\"logicalType\":\"uuid\"},{\"name\":\"fields\",\"type\":{\"type\":\"array\",\"items\":{\"type\":\"record\",\"name\":\"EventField\",\"fields\":[{\"name\":\"name\",\"type\":\"string\"},{\"name\":\"valueType\",\"type\":\"string\"},{\"name\":\"value\",\"type\":\"string\"}]}}}]}]}]}]},{\"name\":\"eventDetails\",\"type\":[\"null\",{\"type\":\"record\",\"name\":\"EventDetails\",\"fields\":[{\"name\":\"eventName\",\"type\":\"string\",\"logicalType\":\"uuid\"},{\"name\":\"fields\",\"type\":{\"type\":\"array\",\"items\":\"EventField\"}}]}]},{\"name\":\"windowRangeStartUTC\",\"type\":[\"null\",\"long\"]},{\"name\":\"windowRangeEndUTC\",\"type\":[\"null\",\"long\"]}]}'
DATA_KEY='{"schema": "'$RECORD_KEY'"}'
DATA_VALUE='{"schema": "'$RECORD_VALUE'"}'
HOST_KEY="http://$REGISTRY:8081/subjects/$TOPIC-key/versions"
HOST_VALUE="http://$REGISTRY:8081/subjects/$TOPIC-value/versions"
echo "curl -X POST -H \"Content-Type: application/vnd.schemaregistry.v1+json\" --data  '$DATA_KEY' $HOST_KEY"
echo "curl -X POST -H \"Content-Type: application/vnd.schemaregistry.v1+json\" --data  '$DATA_VALUE' $HOST_VALUE"
