#!/bin/bash
KAFKA=localhost:9092
REPLICATION=3
RETENTION=3024000000
echo "internal"

echo "kafka-topics --topic gmx-messaging.sportnation-ds-casinobets  --bootstrap-server $KAFKA --create --partitions 6 --replication-factor $REPLICATION --config retention.ms=$RETENTION"
echo "kafka-topics --topic gmx-messaging.sportnation-ds-customerdetails --bootstrap-server $KAFKA --create --partitions 6 --replication-factor $REPLICATION --config retention.ms=$RETENTION"
echo "kafka-topics --topic gmx-messaging.sportnation-ds-logins --bootstrap-server $KAFKA --create --partitions 6 --replication-factor $REPLICATION --config retention.ms=$RETENTION"
echo "kafka-topics --topic gmx-messaging.sportnation-ds-sportbets --bootstrap-server $KAFKA --create --partitions 6 --replication-factor $REPLICATION --config retention.ms=$RETENTION"
echo "kafka-topics --topic gmx-messaging.sportnation-ds-wallettransactions --bootstrap-server $KAFKA --create --partitions 6 --replication-factor $REPLICATION --config retention.ms=$RETENTION"

echo "kafka-topics --topic gmx-messaging.sportnation-sd-external-operator-events --bootstrap-server $KAFKA --create --partitions 6 --replication-factor $REPLICATION --config retention.ms=$RETENTION"
echo "kafka-topics --topic gmx-messaging.sportnation-sd-external-operator-markets --bootstrap-server $KAFKA --create --partitions 6 --replication-factor $REPLICATION --config retention.ms=$RETENTION"
echo "kafka-topics --topic gmx-messaging.sportnation-sd-external-operator-selections --bootstrap-server $KAFKA --create --partitions 6 --replication-factor $REPLICATION --config retention.ms=$RETENTION"

echo "kafka-topics --topic gmx-messaging.redzone-ds-casinobets  --bootstrap-server $KAFKA --create --partitions 6 --replication-factor $REPLICATION --config retention.ms=$RETENTION"
echo "kafka-topics --topic gmx-messaging.redzone-ds-customerdetails --bootstrap-server $KAFKA --create --partitions 6 --replication-factor $REPLICATION --config retention.ms=$RETENTION"
echo "kafka-topics --topic gmx-messaging.redzone-ds-logins --bootstrap-server $KAFKA --create --partitions 6 --replication-factor $REPLICATION --config retention.ms=$RETENTION"
echo "kafka-topics --topic gmx-messaging.redzone-ds-sportbets --bootstrap-server $KAFKA --create --partitions 6 --replication-factor $REPLICATION --config retention.ms=$RETENTION"
echo "kafka-topics --topic gmx-messaging.redzone-ds-wallettransactions --bootstrap-server $KAFKA --create --partitions 6 --replication-factor $REPLICATION --config retention.ms=$RETENTION"

echo "kafka-topics --topic gmx-messaging.redzone-sd-external-operator-events --bootstrap-server $KAFKA --create --partitions 6 --replication-factor $REPLICATION --config retention.ms=$RETENTION"
echo "kafka-topics --topic gmx-messaging.redzone-sd-external-operator-markets --bootstrap-server $KAFKA --create --partitions 6 --replication-factor $REPLICATION --config retention.ms=$RETENTION"
echo "kafka-topics --topic gmx-messaging.redzone-sd-external-operator-selections --bootstrap-server $KAFKA --create --partitions 6 --replication-factor $REPLICATION --config retention.ms=$RETENTION"

echo ""
echo "kafka-topics --topic gmx-messaging.fansbetuk-ds-casinobets  --bootstrap-server $KAFKA --create --partitions 6 --replication-factor $REPLICATION --config retention.ms=$RETENTION"
echo "kafka-topics --topic gmx-messaging.fansbetuk-ds-customerdetails --bootstrap-server $KAFKA --create --partitions 6 --replication-factor $REPLICATION --config retention.ms=$RETENTION"
echo "kafka-topics --topic gmx-messaging.fansbetuk-ds-logins --bootstrap-server $KAFKA --create --partitions 6 --replication-factor $REPLICATION --config retention.ms=$RETENTION"
echo "kafka-topics --topic gmx-messaging.fansbetuk-ds-sportbets --bootstrap-server $KAFKA --create --partitions 6 --replication-factor $REPLICATION --config retention.ms=$RETENTION"
echo "kafka-topics --topic gmx-messaging.fansbetuk-ds-wallettransactions --bootstrap-server $KAFKA --create --partitions 6 --replication-factor $REPLICATION --config retention.ms=$RETENTION"
echo "kafka-topics --topic gmx-messaging.fansbetuk-ds-offerevents --bootstrap-server $KAFKA --create --partitions 6 --replication-factor $REPLICATION --config retention.ms=$RETENTION"
echo "kafka-topics --topic gmx-messaging.fansbetuk-ds-offeroptions --bootstrap-server $KAFKA --create --partitions 6 --replication-factor $REPLICATION --config retention.ms=$RETENTION"

echo ""
echo "external"

echo "kafka-topics --topic ds_casinobets_154  --bootstrap-server $KAFKA --create --partitions 6 --replication-factor $REPLICATION --config retention.ms=$RETENTION"
echo "kafka-topics --topic ds_customerdetails_154 --bootstrap-server $KAFKA --create --partitions 6 --replication-factor $REPLICATION --config retention.ms=$RETENTION"
echo "kafka-topics --topic ds_logins_154 --bootstrap-server $KAFKA --create --partitions 6 --replication-factor $REPLICATION --config retention.ms=$RETENTION"
echo "kafka-topics --topic ds_sportbets_154 --bootstrap-server $KAFKA --create --partitions 6 --replication-factor $REPLICATION --config retention.ms=$RETENTION"
echo "kafka-topics --topic ds_wallettransaction_154 --bootstrap-server $KAFKA --create --partitions 6 --replication-factor $REPLICATION --config retention.ms=$RETENTION"
echo "kafka-topics --topic SD.External.Operator154.Events.v2.PROD --bootstrap-server $KAFKA --create --partitions 6 --replication-factor $REPLICATION --config retention.ms=$RETENTION"
echo "kafka-topics --topic SD.External.Operator154.Markets.v2.PROD --bootstrap-server $KAFKA --create --partitions 6 --replication-factor $REPLICATION --config retention.ms=$RETENTION"
echo "kafka-topics --topic SD.External.Operator154.Selections.v2.PROD --bootstrap-server $KAFKA --create --partitions 6 --replication-factor $REPLICATION --config retention.ms=$RETENTION"

echo ""

echo "kafka-topics --topic ds_casinobets_155  --bootstrap-server $KAFKA --create --partitions 6 --replication-factor $REPLICATION --config retention.ms=$RETENTION"
echo "kafka-topics --topic ds_customerdetails_155 --bootstrap-server $KAFKA --create --partitions 6 --replication-factor $REPLICATION --config retention.ms=$RETENTION"
echo "kafka-topics --topic ds_logins_155 --bootstrap-server $KAFKA --create --partitions 6 --replication-factor $REPLICATION --config retention.ms=$RETENTION"
echo "kafka-topics --topic ds_sportbets_155 --bootstrap-server $KAFKA --create --partitions 6 --replication-factor $REPLICATION --config retention.ms=$RETENTION"
echo "kafka-topics --topic ds_wallettransaction_155 --bootstrap-server $KAFKA --create --partitions 6 --replication-factor $REPLICATION --config retention.ms=$RETENTION"
echo "kafka-topics --topic SD.External.Operator155.Events.v2.PROD --bootstrap-server $KAFKA --create --partitions 6 --replication-factor $REPLICATION --config retention.ms=$RETENTION"
echo "kafka-topics --topic SD.External.Operator155.Markets.v2.PROD --bootstrap-server $KAFKA --create --partitions 6 --replication-factor $REPLICATION --config retention.ms=$RETENTION"
echo "kafka-topics --topic SD.External.Operator155.Selections.v2.PROD --bootstrap-server $KAFKA --create --partitions 6 --replication-factor $REPLICATION --config retention.ms=$RETENTION"

echo ""

echo "kafka-topics --topic ds_casinobets_389  --bootstrap-server $KAFKA --create --partitions 6 --replication-factor $REPLICATION --config retention.ms=$RETENTION"
echo "kafka-topics --topic ds_customerdetails_389 --bootstrap-server $KAFKA --create --partitions 6 --replication-factor $REPLICATION --config retention.ms=$RETENTION"
echo "kafka-topics --topic ds_logins_389 --bootstrap-server $KAFKA --create --partitions 6 --replication-factor $REPLICATION --config retention.ms=$RETENTION"
echo "kafka-topics --topic ds_sportbets_389 --bootstrap-server $KAFKA --create --partitions 6 --replication-factor $REPLICATION --config retention.ms=$RETENTION"
echo "kafka-topics --topic ds_wallettransaction_389 --bootstrap-server $KAFKA --create --partitions 6 --replication-factor $REPLICATION --config retention.ms=$RETENTION"
echo "kafka-topics --topic ds_offerevents_389 --bootstrap-server $KAFKA --create --partitions 6 --replication-factor $REPLICATION --config retention.ms=$RETENTION"
echo "kafka-topics --topic ds_offeroptions_389 --bootstrap-server $KAFKA --create --partitions 6 --replication-factor $REPLICATION --config retention.ms=$RETENTION"



echo "kafka-topics --topic gmx-messaging.redzone-sd-external-operator-events --bootstrap-server $KAFKA --create --partitions 6 --replication-factor $REPLICATION --config retention.ms=$RETENTION"
echo "kafka-topics --topic gmx-messaging.redzone-sd-external-operator-markets --bootstrap-server $KAFKA --create --partitions 6 --replication-factor $REPLICATION --config retention.ms=$RETENTION"
echo "kafka-topics --topic gmx-messaging.redzone-sd-external-operator-selections --bootstrap-server $KAFKA --create --partitions 6 --replication-factor $REPLICATION --config retention.ms=$RETENTION"
