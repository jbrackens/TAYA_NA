#!/bin/bash
# scripts for dev execution
kafka-topics --bootstrap-server localhost:9092 --topic gmx-user-sebtom.customer-logins --create --replica-assignment 1 --config retention.ms=43200000


#kafka-configs --zookeeper localhost:2181  --entity-type topics --alter --add-config retention.ms=10 --entity-name gmx-user-sebtom.sportnation-user-bets-to-watch
#kafka-console-consumer --bootstrap-server localhost:9092 --from-beginning --topic gmx-user-sebtom.sportnation-user-bets-to-watch
#kafka-topics --bootstrap-server localhost:9092 --delete --topic gmx-user-sebtom.sportnation-user-bets-to-watch