
```shell

yaml_helper.sh replace_secrets  secrets/develop.env secret.ytpl .secret.yaml 

helm upgrade --install \
     lenses waysun-dev-stella/eeg-lenses-io \
     --namespace lenses \
     -f default.yaml \
     -f develop.yaml \
     -f .secret.yaml 
```

### Topology to load

````shell
LENSES_TOKEN=$(
curl -sX POST \
  https://lenses.dev.stella.waysungames.com/api/login \
  -H 'Content-Type: application/json' \
  -d '{
    "user": "admin",
    "password": "admin"
  }' 
)

curl -X POST \
  https://lenses.dev.stella.waysungames.com/api/v1/apps/external \
  -H 'Content-Type: application/json' \
  -H "X-Kafka-Lenses-Token: ${LENSES_TOKEN}" \
  -d '{
    "name": "Validator",
    "metadata": {
        "version": "0.1.0",
        "owner": "StreamingTeam",
        "deployment": "Flink",
        "tags": []
    },
    "input": [
        {"name": "stella-messaging.default-event-definition"},
        {"name": "stella-streaming.default-event-raw"}
    ],
    "output": [
        {"name": "stella-streaming.default-event-validated"},
        {"name": "stella-streaming.default-event-failed"}
    ]
}'

curl -X POST \
  https://lenses.dev.stella.waysungames.com/api/v1/apps/external \
  -H 'Content-Type: application/json' \
  -H "X-Kafka-Lenses-Token: ${LENSES_TOKEN}" \
  -d '{
    "name": "RuleConfigurator",
    "metadata": {
        "version": "0.1.0",
        "owner": "ScalaTeam",
        "deployment": "K8s",
        "tags": []
    },
    "input": [],
    "output": [
        {"name": "stella-messaging.default-event-definition"},
        {"name": "stella-messaging.default-aggregation-definition"},
        {"name": "stella-messaging.default-achievement-definition"}
    ]
}'


curl -X POST \
  https://lenses.dev.stella.waysungames.com/api/v1/apps/external \
  -H 'Content-Type: application/json' \
  -H "X-Kafka-Lenses-Token: ${LENSES_TOKEN}" \
  -d '{
    "name": "Aggregator",
    "metadata": {
        "version": "0.1.0",
        "owner": "StreamingTeam",
        "deployment": "Flink",
        "tags": []
    },
    "input": [
        {"name": "stella-streaming.default-event-validated"},
        {"name": "stella-messaging.default-aggregation-definition"}
    ],
    "output": [
        {"name": "stella-streaming.default-aggregation-aggregated"}
    ]
}'


curl -X POST \
  https://lenses.dev.stella.waysungames.com/api/v1/apps/external \
  -H 'Content-Type: application/json' \
  -H "X-Kafka-Lenses-Token: ${LENSES_TOKEN}" \
  -d '{
    "name": "Achievement",
    "metadata": {
        "version": "0.1.0",
        "owner": "StreamingTeam",
        "deployment": "Flink",
        "tags": []
    },
    "input": [
        {"name": "stella-streaming.default-aggregation-aggregated"},
        {"name": "stella-messaging.default-achievement-definition"}
    ],
    "output": [
        {"name": "stella-streaming.default-achievement-achieved"}
    ]
}'

curl -X POST \
  https://lenses.dev.stella.waysungames.com/api/v1/apps/external \
  -H 'Content-Type: application/json' \
  -H "X-Kafka-Lenses-Token: ${LENSES_TOKEN}" \
  -d '{
    "name": "EventIngestor",
    "metadata": {
        "version": "0.1.0",
        "owner": "ScalaTeam",
        "deployment": "K8s",
        "tags": []
    },
    "input": [],
    "output": [{"name": "stella-streaming.default-event-raw"}]
}'

curl -X POST \
  https://lenses.dev.stella.waysungames.com/api/v1/apps/external \
  -H 'Content-Type: application/json' \
  -H "X-Kafka-Lenses-Token: ${LENSES_TOKEN}" \
  -d '{
    "name": "AggregationIngestor",
    "metadata": {
        "version": "0.1.0",
        "owner": "ScalaTeam",
        "deployment": "K8s",
        "tags": []
    },
    "input": [{"name": "stella-streaming.default-aggregation-aggregated"}],
    "output": []
}'

curl -X POST \
  https://lenses.dev.stella.waysungames.com/api/v1/apps/external \
  -H 'Content-Type: application/json' \
  -H "X-Kafka-Lenses-Token: ${LENSES_TOKEN}" \
  -d '{
    "name": "AchievementsConnector",
    "metadata": {
        "version": "0.1.0",
        "owner": "ScalaTeam",
        "deployment": "KafkaConnect",
        "tags": []
    },
    "input": [{"name": "stella-streaming.default-achievement-achieved"}],
    "output": []
}'
````
