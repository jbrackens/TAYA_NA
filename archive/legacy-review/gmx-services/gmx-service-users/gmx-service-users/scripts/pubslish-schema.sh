#!/bin/bash
REGISTRY='localhost'
RECORD_KEY='{\"type\":\"record\",\"name\":\"CustomerMessageKey\",\"namespace\":\"gmx.dataapi.internal.customer\",\"fields\":[{\"name\":\"customerId\",\"type\":\"string\",\"doc\":\"Identifier of the customer\"}]}'
RECORD_VALUE='{\"type\":\"record\",\"name\":\"CustomerLoggedIn\",\"namespace\":\"gmx.dataapi.internal.customer\",\"fields\":[{\"name\":\"messageId\",\"type\":\"string\",\"doc\":\"Unique identifier of given message\"},{\"name\":\"messageOriginDateUTC\",\"type\":\"long\",\"doc\":\"Message creation date in origin\"},{\"name\":\"messageProcessingDateUTC\",\"type\":\"long\",\"doc\":\"Message processing date in GMX platform\"},{\"name\":\"brandId\",\"type\":\"string\",\"doc\":\"Identifier of brand the customer information relates to\"},{\"name\":\"customerId\",\"type\":\"string\",\"doc\":\"Identifier of the customer\"},{\"name\":\"loginTimeUTC\",\"type\":\"long\"}]}'
DATA_KEY='{"schema": "'$RECORD_KEY'"}'
DATA_VALUE='{"schema": "'$RECORD_VALUE'"}'
HOST_KEY="http://$REGISTRY:8081/subjects/gmx-user-sebtom.customer-logins-key/versions"
HOST_VALUE="http://$REGISTRY:8081/subjects/gmx-user-sebtom.customer-logins-value/versions"

echo "curl -X POST -H \"Content-Type: application/vnd.schemaregistry.v1+json\" --data  '$DATA_KEY' $HOST_KEY"
echo "curl -X POST -H \"Content-Type: application/vnd.schemaregistry.v1+json\" --data  '$DATA_VALUE' $HOST_VALUE"

#curl -X DELETE  http://localhost:8081/subjects/gmx-user-sebtom.sportnation-user-bets-to-watch-value/versions/latest