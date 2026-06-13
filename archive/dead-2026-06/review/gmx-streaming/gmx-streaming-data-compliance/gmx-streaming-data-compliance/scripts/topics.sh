#!/bin/bash
# scripts for dev execution
kafka-topics --bootstrap-server localhost:9092 --topic gmx-messaging.sportnation-compliance-validation --create --partitions 6 --replication-factor 1 --config retention.ms=43200000
kafka-topics --bootstrap-server localhost:9092 --topic gmx-messaging.redzone-compliance-validation --create --partitions 6 --replication-factor 1 --config retention.ms=43200000
kafka-topics --bootstrap-server localhost:9092 --topic ds_wallettransactions__154 --create --partitions 6 --replication-factor 1 --config retention.ms=43200000


kafka-topics --bootstrap-server localhost:9092 --topic gmx-messaging.sportnation-compliance-validation --create --partitions 6 --replication-factor 3 --config retention.ms=43200000
kafka-topics --bootstrap-server localhost:9092 --topic gmx-messaging.redzone-compliance-validation --create --partitions 6 --replication-factor 3 --config retention.ms=43200000
kafka-topics --bootstrap-server localhost:9092 --topic gmx-messaging.fansbetuk-compliance-validation --create --partitions 6 --replication-factor 3 --config retention.ms=43200000
