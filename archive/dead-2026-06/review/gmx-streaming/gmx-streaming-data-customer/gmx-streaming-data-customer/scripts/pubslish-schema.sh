#!/bin/bash
REGISTRY='localhost'
RECORD_KEY='{\"type\":\"record\",\"name\":\"CustomerOperationId\",\"namespace\":\"net.flipsports.gmx.dataapi.internal.customers.operations\",\"fields\":[{\"name\":\"externalUserId\",\"type\":\"string\"}]}'
RECORD_VALUE='{\"type\":\"record\",\"name\":\"StateChange\",\"namespace\":\"net.flipsports.gmx.dataapi.internal.customers.operations\",\"fields\":[{\"name\":\"uuid\",\"type\":\"string\",\"logicalType\":\"UUID\"},{\"name\":\"createdDateUTC\",\"type\":[\"null\",\"long\"],\"default\":null},{\"name\":\"companyId\",\"type\":[\"null\",\"string\"],\"default\":null,\"logicalType\":\"UUID\"},{\"name\":\"externalUserId\",\"type\":\"string\"},{\"name\":\"userId\",\"type\":[\"null\",\"string\"],\"default\":null},{\"name\":\"email\",\"type\":[\"null\",\"string\"],\"default\":null},{\"name\":\"action\",\"type\":[\"null\",{\"type\":\"enum\",\"name\":\"ActionType\",\"symbols\":[\"TAG\",\"FLAG\",\"STATUS\",\"NOTE\",\"JIRA\"]}]},{\"name\":\"operationTrigger\",\"type\":[\"null\",\"string\"],\"default\":null},{\"name\":\"payload\",\"type\":[{\"type\":\"record\",\"name\":\"StraightValue\",\"fields\":[{\"name\":\"value\",\"type\":[\"null\",\"string\"],\"default\":null},{\"name\":\"operationKind\",\"type\":[\"null\",{\"type\":\"enum\",\"name\":\"OperationKind\",\"symbols\":[\"add\",\"remove\",\"freeze\",\"removeSE\",\"removeTO\",\"selfExclude\",\"terminate\",\"timeOut\",\"unFreeze\"]}]}]},{\"type\":\"record\",\"name\":\"ComplexValue\",\"fields\":[{\"name\":\"value\",\"type\":{\"type\":\"map\",\"values\":\"string\"}},{\"name\":\"operationKind\",\"type\":\"OperationKind\"}]}]},{\"name\":\"operationTarget\",\"type\":[\"null\",\"string\"],\"default\":null}]}'
DATA_KEY='{"schema": "'$RECORD_KEY'"}'
DATA_VALUE='{"schema": "'$RECORD_VALUE'"}'
HOST_KEY="http://$REGISTRY:8081/subjects/gmx-messaging.sportnation-customer-tagging-key/versions"
HOST_VALUE="http://$REGISTRY:8081/subjects/gmx-messaging.sportnation-customer-tagging-value/versions"

echo "curl -X POST -H \"Content-Type: application/vnd.schemaregistry.v1+json\" --data  '$DATA_KEY' $HOST_KEY"
echo "curl -X POST -H \"Content-Type: application/vnd.schemaregistry.v1+json\" --data  '$DATA_VALUE' $HOST_VALUE"

REGISTRY='localhost'
RECORD_KEY='{\"type\":\"record\",\"name\":\"CustomerOperationId\",\"namespace\":\"net.flipsports.gmx.dataapi.internal.customers.operations\",\"fields\":[{\"name\":\"externalUserId\",\"type\":\"string\"}]}'
RECORD_VALUE='{\"type\":\"record\",\"name\":\"StateChange\",\"namespace\":\"net.flipsports.gmx.dataapi.internal.customers.operations\",\"fields\":[{\"name\":\"uuid\",\"type\":\"string\",\"logicalType\":\"UUID\"},{\"name\":\"createdDateUTC\",\"type\":[\"null\",\"long\"],\"default\":null},{\"name\":\"companyId\",\"type\":[\"null\",\"string\"],\"default\":null,\"logicalType\":\"UUID\"},{\"name\":\"externalUserId\",\"type\":\"string\"},{\"name\":\"userId\",\"type\":[\"null\",\"string\"],\"default\":null},{\"name\":\"email\",\"type\":[\"null\",\"string\"],\"default\":null},{\"name\":\"action\",\"type\":[\"null\",{\"type\":\"enum\",\"name\":\"ActionType\",\"symbols\":[\"TAG\",\"FLAG\",\"STATUS\",\"NOTE\",\"JIRA\"]}]},{\"name\":\"operationTrigger\",\"type\":[\"null\",\"string\"],\"default\":null},{\"name\":\"payload\",\"type\":[{\"type\":\"record\",\"name\":\"StraightValue\",\"fields\":[{\"name\":\"value\",\"type\":[\"null\",\"string\"],\"default\":null},{\"name\":\"operationKind\",\"type\":[\"null\",{\"type\":\"enum\",\"name\":\"OperationKind\",\"symbols\":[\"add\",\"remove\",\"freeze\",\"removeSE\",\"removeTO\",\"selfExclude\",\"terminate\",\"timeOut\",\"unFreeze\"]}]}]},{\"type\":\"record\",\"name\":\"ComplexValue\",\"fields\":[{\"name\":\"value\",\"type\":{\"type\":\"map\",\"values\":\"string\"}},{\"name\":\"operationKind\",\"type\":\"OperationKind\"}]}]},{\"name\":\"operationTarget\",\"type\":[\"null\",\"string\"],\"default\":null}]}'
DATA_KEY='{"schema": "'$RECORD_KEY'"}'
DATA_VALUE='{"schema": "'$RECORD_VALUE'"}'
HOST_KEY="http://$REGISTRY:8081/subjects/gmx-messaging.redzone-customer-tagging-key/versions"
HOST_VALUE="http://$REGISTRY:8081/subjects/gmx-messaging.redzone-customer-tagging-value/versions"

echo "curl -X POST -H \"Content-Type: application/vnd.schemaregistry.v1+json\" --data  '$DATA_KEY' $HOST_KEY"
echo "curl -X POST -H \"Content-Type: application/vnd.schemaregistry.v1+json\" --data  '$DATA_VALUE' $HOST_VALUE"

REGISTRY='localhost'
RECORD_KEY='{\"type\":\"record\",\"name\":\"CustomerOperationId\",\"namespace\":\"net.flipsports.gmx.dataapi.internal.customers.operations\",\"fields\":[{\"name\":\"externalUserId\",\"type\":\"string\"}]}'
RECORD_VALUE='{\"type\":\"record\",\"name\":\"StateChange\",\"namespace\":\"net.flipsports.gmx.dataapi.internal.customers.operations\",\"fields\":[{\"name\":\"uuid\",\"type\":\"string\",\"logicalType\":\"UUID\"},{\"name\":\"createdDateUTC\",\"type\":[\"null\",\"long\"],\"default\":null},{\"name\":\"companyId\",\"type\":[\"null\",\"string\"],\"default\":null,\"logicalType\":\"UUID\"},{\"name\":\"externalUserId\",\"type\":\"string\"},{\"name\":\"userId\",\"type\":[\"null\",\"string\"],\"default\":null},{\"name\":\"email\",\"type\":[\"null\",\"string\"],\"default\":null},{\"name\":\"action\",\"type\":[\"null\",{\"type\":\"enum\",\"name\":\"ActionType\",\"symbols\":[\"TAG\",\"FLAG\",\"STATUS\",\"NOTE\",\"JIRA\"]}]},{\"name\":\"operationTrigger\",\"type\":[\"null\",\"string\"],\"default\":null},{\"name\":\"payload\",\"type\":[{\"type\":\"record\",\"name\":\"StraightValue\",\"fields\":[{\"name\":\"value\",\"type\":[\"null\",\"string\"],\"default\":null},{\"name\":\"operationKind\",\"type\":[\"null\",{\"type\":\"enum\",\"name\":\"OperationKind\",\"symbols\":[\"add\",\"remove\",\"freeze\",\"removeSE\",\"removeTO\",\"selfExclude\",\"terminate\",\"timeOut\",\"unFreeze\"]}]}]},{\"type\":\"record\",\"name\":\"ComplexValue\",\"fields\":[{\"name\":\"value\",\"type\":{\"type\":\"map\",\"values\":\"string\"}},{\"name\":\"operationKind\",\"type\":\"OperationKind\"}]}]},{\"name\":\"operationTarget\",\"type\":[\"null\",\"string\"],\"default\":null}]}'
DATA_KEY='{"schema": "'$RECORD_KEY'"}'
DATA_VALUE='{"schema": "'$RECORD_VALUE'"}'
HOST_KEY="http://$REGISTRY:8081/subjects/gmx-messaging.fansbetuk-customer-tagging-key/versions"
HOST_VALUE="http://$REGISTRY:8081/subjects/gmx-messaging.fansbetuk-customer-tagging-value/versions"

echo "curl -X POST -H \"Content-Type: application/vnd.schemaregistry.v1+json\" --data  '$DATA_KEY' $HOST_KEY"
echo "curl -X POST -H \"Content-Type: application/vnd.schemaregistry.v1+json\" --data  '$DATA_VALUE' $HOST_VALUE"

#REGISTRY='localhost'
#RECORD_KEY='{\"type\":\"record\",\"name\":\"AbuseId\",\"namespace\":\"SBTech.Microservices.DataStreaming.DTO.RegistrationUserAbuse.v1\",\"fields\":[{\"name\":\"CustomerID\",\"type\":\"int\",\"default\":0}],\"default\":null}'
#RECORD_VALUE='{\"type\":\"record\",\"name\":\"RegistrationUserAbuse\",\"namespace\":\"SBTech.Microservices.DataStreaming.DTO.RegistrationUserAbuse.v1\",\"fields\":[{\"name\":\"MessageCreationDate\",\"type\":\"long\",\"default\":0},{\"name\":\"CustomerID\",\"type\":\"int\",\"default\":0},{\"name\":\"email\",\"type\":[\"null\",\"string\"],\"default\":null},{\"name\":\"customerDetailsMessage\",\"type\":[\"null\",\"string\"],\"default\":null},{\"name\":\"customerLoginMessage\",\"type\":[\"null\",\"string\"],\"default\":null}]}'
#DATA_KEY='{"schema": "'$RECORD_KEY'"}'
#DATA_VALUE='{"schema": "'$RECORD_VALUE'"}'
#HOST_KEY="http://$REGISTRY:8081/subjects/gmx-messaging.sportnation-customer-abuse-key/versions"
#HOST_VALUE="http://$REGISTRY:8081/subjects/gmx-messaging.sportnation-customer-abuse-value/versions"
#
#echo "curl -X POST -H \"Content-Type: application/vnd.schemaregistry.v1+json\" --data  '$DATA_KEY' $HOST_KEY"
#echo "curl -X POST -H \"Content-Type: application/vnd.schemaregistry.v1+json\" --data  '$DATA_VALUE' $HOST_VALUE"



REGISTRY='localhost'
RECORD_KEY='{\"type\":\"record\",\"name\":\"CustomerOperationId\",\"namespace\":\"net.flipsports.gmx.dataapi.internal.customers.operations\",\"fields\":[{\"name\":\"externalUserId\",\"type\":\"string\"}]}'
RECORD_VALUE='{\"type\":\"record\",\"name\":\"StateChange\",\"namespace\":\"net.flipsports.gmx.dataapi.internal.customers.operations\",\"fields\":[{\"name\":\"uuid\",\"type\":\"string\",\"logicalType\":\"UUID\"},{\"name\":\"createdDateUTC\",\"type\":[\"null\",\"long\"],\"default\":null},{\"name\":\"companyId\",\"type\":[\"null\",\"string\"],\"default\":null,\"logicalType\":\"UUID\"},{\"name\":\"externalUserId\",\"type\":\"string\"},{\"name\":\"userId\",\"type\":[\"null\",\"string\"],\"default\":null},{\"name\":\"email\",\"type\":[\"null\",\"string\"],\"default\":null},{\"name\":\"action\",\"type\":[\"null\",{\"type\":\"enum\",\"name\":\"ActionType\",\"symbols\":[\"TAG\",\"FLAG\",\"STATUS\",\"NOTE\"]}]},{\"name\":\"operationTrigger\",\"type\":[\"null\",\"string\"],\"default\":null},{\"name\":\"payload\",\"type\":[{\"type\":\"record\",\"name\":\"StraightValue\",\"fields\":[{\"name\":\"value\",\"type\":[\"null\",\"string\"],\"default\":null},{\"name\":\"operationKind\",\"type\":[\"null\",{\"type\":\"enum\",\"name\":\"OperationKind\",\"symbols\":[\"add\",\"remove\",\"freeze\",\"removeSE\",\"removeTO\",\"selfExclude\",\"terminate\",\"timeOut\",\"unFreeze\"]}]}]}]}]}'
DATA_KEY='{"schema": "'$RECORD_KEY'"}'
DATA_VALUE='{"schema": "'$RECORD_VALUE'"}'

BRAND="fansbetuk"
HOST_KEY="http://$REGISTRY:8081/subjects/gmx-messaging.$BRAND-customer-action-key/versions"
HOST_VALUE="http://$REGISTRY:8081/subjects/gmx-messaging.$BRAND-customer-action-value/versions"
echo "curl -X POST -H \"Content-Type: application/vnd.schemaregistry.v1+json\" --data  '$DATA_KEY' $HOST_KEY"
echo "curl -X POST -H \"Content-Type: application/vnd.schemaregistry.v1+json\" --data  '$DATA_VALUE' $HOST_VALUE"


BRAND="sportnation"
HOST_KEY="http://$REGISTRY:8081/subjects/gmx-messaging.$BRAND-customer-action-key/versions"
HOST_VALUE="http://$REGISTRY:8081/subjects/gmx-messaging.$BRAND-customer-action-value/versions"
echo "curl -X POST -H \"Content-Type: application/vnd.schemaregistry.v1+json\" --data  '$DATA_KEY' $HOST_KEY"
echo "curl -X POST -H \"Content-Type: application/vnd.schemaregistry.v1+json\" --data  '$DATA_VALUE' $HOST_VALUE"

BRAND="redzone"
HOST_KEY="http://$REGISTRY:8081/subjects/gmx-messaging.$BRAND-customer-action-key/versions"
HOST_VALUE="http://$REGISTRY:8081/subjects/gmx-messaging.$BRAND-customer-action-value/versions"
echo "curl -X POST -H \"Content-Type: application/vnd.schemaregistry.v1+json\" --data  '$DATA_KEY' $HOST_KEY"
echo "curl -X POST -H \"Content-Type: application/vnd.schemaregistry.v1+json\" --data  '$DATA_VALUE' $HOST_VALUE"