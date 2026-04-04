#!/bin/bash


# production
./kafka-topics.sh --bootstrap-server localhost:9092 --topic SD.External.Operator154.Events.v2.PROD --create --partitions 6 --replication-factor 3 --config retention.ms=3000000000
./kafka-topics.sh --bootstrap-server localhost:9092 --topic SD.External.Operator154.Markets.v2.PROD --create --partitions 6 --replication-factor 3 --config retention.ms=3000000000
./kafka-topics.sh --bootstrap-server localhost:9092 --topic SD.External.Operator154.Selections.v2.PROD --create --partitions 6 --replication-factor 3 --config retention.ms=3000000000
./kafka-topics.sh --bootstrap-server localhost:9092 --topic gmx-messaging.sportnation-racing-roulette-horse-events --create --replication-factor 3 --partitions 3 --config min.compaction.lag.ms=10000  --config cleanup.policy=compact --config delete.retention.ms=10000  --config segment.ms=10000 --config segment.bytes=104857600 --config min.cleanable.dirty.ratio=0.1

# delete production topic
./kafka-topics.sh --bootstrap-server localhost:9092 --topic SD.External.Operator154.Events.v2.PROD --delete
./kafka-topics.sh --bootstrap-server localhost:9092 --topic SD.External.Operator154.Markets.v2.PROD --delete
./kafka-topics.sh --bootstrap-server localhost:9092 --topic SD.External.Operator154.Selections.v2.PROD --delete
./kafka-topics.sh --bootstrap-server localhost:9092 --topic gmx-messaging.sportnation-racing-roulette-horse-events --delete



# development
./kafka-topics.sh --bootstrap-server localhost:9092 --topic SD.External.Operator154.Events.v2.PROD --create --partitions 6 --replication-factor 1 --config retention.ms=259200000
./kafka-topics.sh --bootstrap-server localhost:9092 --topic SD.External.Operator154.Markets.v2.PROD --create --partitions 6 --replication-factor 1 --config retention.ms=259200000
./kafka-topics.sh --bootstrap-server localhost:9092 --topic SD.External.Operator154.Selections.v2.PROD --create --partitions 6 --replication-factor 1 --config retention.ms=259200000
./kafka-topics.sh --bootstrap-server localhost:9092 --topic gmx-messaging.sportnation-racing-roulette-horse-events --create --replication-factor 1 --partitions 3 --config min.compaction.lag.ms=1000  --config cleanup.policy=compact --config delete.retention.ms=1000  --config segment.ms=1000 --config segment.bytes=104857600 --config min.cleanable.dirty.ratio=0.1


kafka-topics --bootstrap-server localhost:9092 --topic SD.External.Operator154.Events.v2.PROD --create --partitions 6 --replication-factor 1 --config retention.ms=3000000000
kafka-topics --bootstrap-server localhost:9092 --topic SD.External.Operator154.Markets.v2.PROD --create --partitions 6 --replication-factor 1 --config retention.ms=3000000000
kafka-topics --bootstrap-server localhost:9092 --topic SD.External.Operator154.Selections.v2.PROD --create --partitions 6 --replication-factor 1 --config retention.ms=3000000000

kafka-topics --bootstrap-server localhost:9092 --topic gmx-streaming.sportnation-odds-events --create --partitions 6 --replication-factor 1 --config retention.ms=3000000000
kafka-topics --bootstrap-server localhost:9092 --topic gmx-streaming.sportnation-odds-markets --create --partitions 6 --replication-factor 1 --config retention.ms=3000000000
kafka-topics --bootstrap-server localhost:9092 --topic gmx-streaming.sportnation-odds-selections --create --partitions 6 --replication-factor 1 --config retention.ms=3000000000

kafka-topics --bootstrap-server localhost:9092 --topic gmx-messaging.sportnation-racing-roulette-horse-events --create --replication-factor 1 --partitions 3 --config min.compaction.lag.ms=1000  --config cleanup.policy=compact --config delete.retention.ms=1000  --config segment.ms=1000 --config segment.bytes=104857600 --config min.cleanable.dirty.ratio=0.1

./kafka-topics.sh --bootstrap-server localhost:9092 --topic gmx-messaging.sportnation-racing-roulette-horse-events --create --replication-factor 1 --partitions 3 --config min.compaction.lag.ms=10000  --config cleanup.policy=compact --config delete.retention.ms=1000  --config segment.ms=1000 --config segment.bytes=104857600 --config min.cleanable.dirty.ratio=0.1
./kafka-topics.sh --bootstrap-server localhost:9092 --topic gmx-messaging.sportnation-site-extensions-sportevents --create --replication-factor 3 --partitions 3 --config min.compaction.lag.ms=10000  --config cleanup.policy=delete,compact --config delete.retention.ms=1209600000  --config segment.ms=10000 --config segment.bytes=104857600 --config min.cleanable.dirty.ratio=0.2
./kafka-topics.sh --bootstrap-server localhost:9092 --topic gmx-messaging.redzone-site-extensions-sportevents --create --replication-factor 3 --partitions 3 --config min.compaction.lag.ms=10000  --config cleanup.policy=delete,compact --config delete.retention.ms=1209600000  --config segment.ms=10000 --config segment.bytes=104857600 --config min.cleanable.dirty.ratio=0.2

#delete development topic
./kafka-topics.sh --bootstrap-server localhost:9092 --topic SD.External.Operator154.Events.v2.PROD --delete
./kafka-topics.sh --bootstrap-server localhost:9092 --topic SD.External.Operator154.Markets.v2.PROD --delete
./kafka-topics.sh --bootstrap-server localhost:9092 --topic SD.External.Operator154.Selections.v2.PROD --delete
./kafka-topics.sh --bootstrap-server localhost:9092 --topic gmx-messaging.sportnation-racing-roulette-horse-events --delete
./kafka-topics.sh --bootstrap-server localhost:9092 --topic gmx-messaging.sportnation-site-extensions-sportevents --delete


# utils commands on development kafka
# offsets on partitions
./kafka-run-class.sh kafka.tools.GetOffsetShell --broker-list localhost:9092 --topic gmx-messaging.sportnation-racing-roulette-horse-events --time -1
# overall offsets
./kafka-run-class.sh kafka.tools.GetOffsetShell --broker-list localhost:9092 --topic gmx-messaging.sportnation-racing-roulette-horse-events --time -1 --offsets 1 | awk -F ":" '{sum += $3} END {print "racing-roulette-horse-events = "sum}'
./kafka-run-class.sh kafka.tools.GetOffsetShell --broker-list localhost:9092 --topic SD.External.Operator154.Events.v2.PROD --time -1 --offsets 1 | awk -F ":" '{sum += $3} END {print "events = "sum}'
./kafka-run-class.sh kafka.tools.GetOffsetShell --broker-list localhost:9092 --topic SD.External.Operator154.Selections.v2.PROD --time -1 --offsets 1 | awk -F ":" '{sum += $3} END {print "selections = "sum}'
./kafka-run-class.sh kafka.tools.GetOffsetShell --broker-list localhost:9092 --topic SD.External.Operator154.Markets.v2.PROD --time -1 --offsets 1 | awk -F ":" '{sum += $3} END {print "markets = "sum}'


# list all groups
./kafka-consumer-groups.sh     --bootstrap-server localhost:9092    --list
./kafka-consumer-groups.sh     --bootstrap-server localhost:9092    --group gmx-streaming.sportnation-odds-selections --describe
./kafka-consumer-groups.sh     --bootstrap-server localhost:9092    --group gmx-streaming.sportnation-odds-events --describe
./kafka-consumer-groups.sh     --bootstrap-server localhost:9092    --group gmx-streaming.sportnation-odds-markets --describe

# reseting offset to 0 or earlies possible od given group for all topics which group consume
./kafka-consumer-groups.sh     --bootstrap-server localhost:9092    --group gmx-streaming.sportnation-odds-selections  --reset-offsets     --all-topics     --to-offset 0 --execute
./kafka-consumer-groups.sh     --bootstrap-server localhost:9092    --group gmx-streaming.sportnation-odds-events      --reset-offsets     --all-topics     --to-offset 0 --execute
./kafka-consumer-groups.sh     --bootstrap-server localhost:9092    --group gmx-streaming.sportnation-odds-markets     --reset-offsets     --all-topics     --to-offset 0 --execute


# production topics counts
./kafka-run-class.sh kafka.tools.GetOffsetShell --broker-list localhost:9092 --topic SD.External.Operator154.Events.v2.PROD --time -1 --offsets 1 | awk -F ":" '{sum += $3} END {print "SD.External.Operator154.Events.v2.PROD,"sum}' &&
./kafka-run-class.sh kafka.tools.GetOffsetShell --broker-list localhost:9092 --topic SD.External.Operator154.Markets.v2.PROD --time -1 --offsets 1 | awk -F ":" '{sum += $3} END {print "SD.External.Operator154.Markets.v2.PROD,"sum}' &&
./kafka-run-class.sh kafka.tools.GetOffsetShell --broker-list localhost:9092 --topic SD.External.Operator154.Selections.v2.PROD --time -1 --offsets 1 | awk -F ":" '{sum += $3} END {print "SD.External.Operator154.Selections.v2.PROD,"sum}'


# sbtech describe of consumer group (mirror)
sh kafka-consumer-groups.sh  --bootstrap-server datastream.sbtech.info:39092 --group sportsnation-com-group  --command-config /kafka-data/kafka-mirror-sbtech/sportsnation/stats.command.properties --describe | sed 's/  / /g' | sed 's/  / /g' | sed 's/  / /g' | sed 's/  / /g' | sed 's/ /,/g' | tail -n +3 | sed -e 's/^/'"$timestamp"',/'| awk -F',' '{ print ""$3","$4","$5","$6""}'


# rest offset for all topics in group

./kafka-consumer-groups.sh     --bootstrap-server datastream.sbtech.info:39092 --group sportsnation-com-group  --command-config /kafka-data/kafka-mirror-sbtech/sportsnation/consumer.properties      --reset-offsets     --all-topics     --to-offset 0 --execute