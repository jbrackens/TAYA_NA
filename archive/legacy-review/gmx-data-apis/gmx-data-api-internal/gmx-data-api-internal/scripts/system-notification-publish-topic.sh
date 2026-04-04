#!/bin/bash
export zookeeper="localhost:2181"
kafka-topics --zookeeper $zookeeper --topic eeg-technical.sportnation-system-notification --create --partitions 6 --replication-factor 3 --config retention.ms=3000000000
