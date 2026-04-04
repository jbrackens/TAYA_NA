package gmx.widget.siteextentions.datafeed.service.sportevents

import scala.concurrent.duration.DurationInt
import scala.concurrent.duration.FiniteDuration

import com.typesafe.config.Config

import gmx.common.scala.core.config.BaseConfig

case class SportEventsConfig(kafkaSource: SportEventsKafkaConfig, persistence: MessageToRetryPersistenceConfig)

case class MessageToRetryPersistenceConfig(
    firstRetryDelay: FiniteDuration,
    nextRetriesDelayMultiplier: Int,
    maxRetries: Int,
    startRetryJob: Boolean,
    retryJobFrequencySeconds: Int,
    retryEventsBatchSize: Int,
    startCleanupJob: Boolean,
    cleanupJobCronTrigger: String,
    cleanupJobTimeZone: String,
    deleteMessagesRetriedEarlierThan: FiniteDuration)

object MessageToRetryPersistenceConfig {
  // for test purposes
  val dummy: MessageToRetryPersistenceConfig = MessageToRetryPersistenceConfig(
    firstRetryDelay = 30.seconds,
    nextRetriesDelayMultiplier = 2,
    maxRetries = 5,
    startRetryJob = false,
    retryJobFrequencySeconds = 10,
    retryEventsBatchSize = 500,
    startCleanupJob = false,
    cleanupJobCronTrigger = "0 1 * * *",
    cleanupJobTimeZone = "UTC",
    deleteMessagesRetriedEarlierThan = 7.days)
}

case class SportEventsKafkaConfig(
    dumpRecords: Boolean,
    enabled: Boolean,
    topic: String,
    groupId: String,
    schemaRegistry: String,
    consumerConfig: Config)

object SportEventsConfig extends BaseConfig[SportEventsConfig]("app.sport-events")
