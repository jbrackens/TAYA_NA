package stella.leaderboard.ingestor

import java.time
import java.time.OffsetDateTime
import java.util.Collections

import scala.concurrent.Await
import scala.concurrent.ExecutionContext
import scala.concurrent.Future
import scala.concurrent.duration.Duration
import scala.jdk.CollectionConverters.IterableHasAsScala
import scala.jdk.DurationConverters.ScalaDurationOps
import scala.util.Failure
import scala.util.Success
import scala.util.control.NonFatal

import org.apache.kafka.clients.consumer.ConsumerRecord
import org.apache.kafka.clients.consumer.KafkaConsumer
import org.slf4j.Logger
import org.slf4j.LoggerFactory

import stella.common.core.Clock
import stella.common.kafka.KafkaAvroConsumerProperties
import stella.dataapi.aggregation.{AggregationResult => ApiAggregationResult}
import stella.dataapi.aggregation.{AggregationResultKey => ApiAggregationResultKey}

import stella.leaderboard.ingestor.config.LeaderboardKafkaConfig
import stella.leaderboard.models.AggregationResultFromEvent
import stella.leaderboard.services.LeaderboardBoundedContext

class KafkaAggregationResultIngestor(config: LeaderboardKafkaConfig, boundedContext: LeaderboardBoundedContext)(implicit
    clock: Clock,
    ec: ExecutionContext) {
  import KafkaAggregationResultIngestor.log

  @volatile private var isRunning = false

  def start(): Unit = synchronized {
    if (!isRunning) {
      isRunning = true
      val _ = Future {
        log.info(s"Starting Kafka consumer listening on topic ${config.topicName}")
        val kafkaConsumer = createConsumer()
        val kafkaPollTimeout = config.consumer.kafkaPollTimeout.toJava
        while (isRunning) pollAndStore(kafkaConsumer, kafkaPollTimeout)
        log.info(s"Stopping Kafka consumer listening on topic ${config.topicName}")
        kafkaConsumer.close()
      }
    }
  }

  def requestStop(): Unit = synchronized {
    isRunning = false
  }

  private def createConsumer(): KafkaConsumer[ApiAggregationResultKey, ApiAggregationResult] = {
    val properties = KafkaAvroConsumerProperties.fromConfig(config.bootstrapServers, config.consumer, config.serializer)
    val kafkaConsumer = new KafkaConsumer[ApiAggregationResultKey, ApiAggregationResult](properties)
    kafkaConsumer.subscribe(Collections.singletonList(config.topicName))
    kafkaConsumer
  }

  private def pollAndStore(
      kafkaConsumer: KafkaConsumer[ApiAggregationResultKey, ApiAggregationResult],
      kafkaPollTimeout: time.Duration): Unit = {
    val records = kafkaConsumer.poll(kafkaPollTimeout).asScala
    val currentDateTime = clock.currentUtcOffsetDateTime()
    val aggregationResults = convertToInternalModel(records, currentDateTime)
    if (aggregationResults.nonEmpty) storeInDatabase(aggregationResults, records.size)
  }

  private def convertToInternalModel(
      records: Iterable[ConsumerRecord[ApiAggregationResultKey, ApiAggregationResult]],
      currentDateTime: OffsetDateTime): Seq[AggregationResultFromEvent] = {
    records.flatMap { record =>
      val key = record.key()
      val value = record.value()
      log.trace(s"""Received:
           | key = $key
           | value = $value""".stripMargin)
      AggregationResultFromEvent.fromDataApiAggregationResult(
        key,
        value,
        createdAt = currentDateTime,
        updatedAt = currentDateTime) match {
        case Success(value) =>
          List(value)
        case Failure(e) =>
          log.error(s"A record ($key, $value) contains incorrect data and won't be stored", e)
          Nil
      }
    }.toSeq
  }

  private def storeInDatabase(aggregationResults: Seq[AggregationResultFromEvent], recordsSize: Int): Unit = {
    // we need to ensure the results are stored in a correct order
    try {
      Await.result(
        boundedContext
          .storeAggregationResults(aggregationResults)
          .map(numberOfStoredResults =>
            log.info(
              s"Received: $recordsSize records, correct aggregation results: ${aggregationResults.size}, stored: $numberOfStoredResults")),
        Duration.Inf)
    } catch {
      case NonFatal(e) => log.error(s"Processing aggregation results '$aggregationResults' failed", e)
    }
  }
}

object KafkaAggregationResultIngestor {
  private val log: Logger = LoggerFactory.getLogger(getClass)
}
