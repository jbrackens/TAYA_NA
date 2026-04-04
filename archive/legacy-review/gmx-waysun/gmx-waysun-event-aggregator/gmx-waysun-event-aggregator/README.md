# eeg-waysun-event-aggregator
Streaming Application responsible for publishing aggregation

## event-aggregator
 Module with all flink jobs. Currently, we have:
 

## Building:
  - sbt clean compile
  - sbt test
  - sbt event-aggregator/assembly

## Generating publish schema scripts
 `sbt kafkascriptsRegisterSchema`

## Technology stack:
 - Apache Flink https://flink.apache.org
 - Scala
 - sbt
 - Apache Avro
 - Type Safe Config


## Build system on Jenkins.


## Deployment

### `scripts/topics.sh`

This script template is taken from [`waysun-frankfurt`](https://github.com/flipadmin/waysun-frankfurt) to create topics on Kafka.

Example usages:

```shell
./scripts/topics.sh --exec kafka-topics.sh --zookeeper zookeeper.streaming
```
### Environment Variable Configuration

| Env Variable | Expected Value | Meaning                  |
|----------|----------------|--------------------------|
| EEG_WAYSUN_KAFKA_BOOTSTRAP | kafka.streaming.svc.cluster.local:9092 | Kafka brokers address    |
| EEG_WAYSUN_KAFKA_SCHEMA_REGISTRY_URL | http://cp-schema-registry.streaming.svc.cluster.local:8081     | AVRO schema registry URI |
