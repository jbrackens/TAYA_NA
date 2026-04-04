#!/bin/bash
# scripts for dev execution
kafka-topics --bootstrap-server localhost:9092 --topic gmx-messaging.sportnation-customer-state-change --create --partitions 6 --replication-factor 1 --config retention.ms=43200000
kafka-topics --bootstrap-server localhost:9092 --topic ds_customerdetails_154 --create --partitions 6 --replication-factor 1 --config retention.ms=43200000


kafka-topics --bootstrap-server localhost:9092 --topic gmx-messaging.sportnation-customer-tagging --create --partitions 6 --replication-factor 3 --config retention.ms=43200000
kafka-topics --bootstrap-server localhost:9092 --topic gmx-messaging.redzone-customer-tagging --create --partitions 6 --replication-factor 3 --config retention.ms=43200000
kafka-topics --bootstrap-server localhost:9092 --topic gmx-messaging.fansbetuk-customer-tagging --create --partitions 6 --replication-factor 3 --config retention.ms=43200000



kafka-topics --bootstrap-server localhost:9092 --topic gmx-messaging.sportnation-customer-action --create --partitions 6 --replication-factor 3 --config retention.ms=43200000
kafka-topics --bootstrap-server localhost:9092 --topic gmx-messaging.redzone-customer-action --create --partitions 6 --replication-factor 3 --config retention.ms=43200000
kafka-topics --bootstrap-server localhost:9092 --topic gmx-messaging.fansbetuk-customer-action --create --partitions 6 --replication-factor 3 --config retention.ms=43200000