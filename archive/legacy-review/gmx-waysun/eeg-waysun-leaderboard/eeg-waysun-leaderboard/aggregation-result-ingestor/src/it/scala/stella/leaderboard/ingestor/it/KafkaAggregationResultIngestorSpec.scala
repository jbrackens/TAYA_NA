package stella.leaderboard.ingestor.it

import java.time.OffsetDateTime
import java.util.UUID

import scala.concurrent.Await
import scala.util.Random

import org.scalamock.scalatest.MockFactory
import org.scalatest.BeforeAndAfterAll
import org.scalatest.OptionValues

import stella.common.core.OffsetDateTimeUtils
import stella.common.kafka.KafkaPublicationServiceImpl
import stella.common.kafka.config.KafkaProducerConfig
import stella.common.kafka.config.ProducerConfig
import stella.common.models.Ids.ProjectId
import stella.dataapi.aggregation.{AggregationResult => ApiAggregationResult}
import stella.dataapi.aggregation.{AggregationResultKey => ApiAggregationResultKey}
import stella.dataapi.aggregation.{AggregationValues => ApiAggregationValues}

import stella.leaderboard.ingestor.it.gen.Generators.apiAggregationValuesGen
import stella.leaderboard.models
import stella.leaderboard.models.AggregationResultFromEvent
import stella.leaderboard.models.Ids.AggregationRuleId

class KafkaAggregationResultIngestorSpec
    extends IntegrationTestBase
    with MockFactory
    with BeforeAndAfterAll
    with OptionValues {
  // scalastyle:off
  import scala.concurrent.ExecutionContext.Implicits.global
  // scalastyle:on

  override protected def afterAll(): Unit = {
    ingestorModule.aggregationResultIngestor.requestStop()
  }

  private val nullValue = None.orNull

  "Kafka aggregation results consumer" should {
    "store only correct aggregation results" in {
      withKafkaServices { kafkaPublicationService =>
        // GIVEN: 3 aggregation results, one of them has too long groupByFieldValue, one has too long custom value
        val projectId = ProjectId.random()
        val aggregationRuleId = AggregationRuleId.random()
        val groupByFieldValue = "field value 1"
        val key = new ApiAggregationResultKey(aggregationRuleId.toString, projectId.toString, nullValue)
        val aggregationValues = new ApiAggregationValues(0, 1, 2, 3, "4")
        val value = new ApiAggregationResult(nullValue, nullValue, aggregationValues)
        val key2 = new ApiAggregationResultKey(aggregationRuleId.toString, projectId.toString, groupByFieldValue)
        val incorrectKey =
          new ApiAggregationResultKey(
            aggregationRuleId.toString,
            projectId.toString,
            Random.nextString(TestConstants.maxGroupByFieldValueLength + 1))
        val incorrectValue =
          new ApiAggregationResult(
            nullValue,
            nullValue,
            new ApiAggregationValues(0, 1, 2, 3, Random.nextString(TestConstants.maxCustomValueLength + 1)))

        // WHEN: aggregation results are published to Kafka
        publishAggregationResult(kafkaPublicationService, key2, incorrectValue)
        publishAggregationResult(kafkaPublicationService, incorrectKey, value)
        publishAggregationResult(kafkaPublicationService, key, value)

        // THEN: only the correct one is stored in the database
        eventually {
          val aggregationResults = getAggregationResults(projectId, aggregationRuleId)
          val expectedAggregationResults = Seq(
            models.AggregationResultFromEvent(
              projectId = projectId,
              aggregationRuleId = aggregationRuleId,
              groupByFieldValue = "",
              windowRangeStart = None,
              windowRangeEnd = None,
              min = aggregationValues.getMin,
              max = aggregationValues.getMax,
              count = aggregationValues.getCount,
              sum = aggregationValues.getSum,
              custom = aggregationValues.getCustom.toString,
              createdAt = testClock.currentUtcOffsetDateTime(),
              updatedAt = testClock.currentUtcOffsetDateTime()))
          aggregationResults shouldBe expectedAggregationResults
        }
      }
    }

    "is able to update a result" in {
      withKafkaServices { kafkaPublicationService =>
        // GIVEN: one aggregation result
        val projectId = ProjectId.random()
        val aggregationRuleId = AggregationRuleId.random()
        val key = new ApiAggregationResultKey(aggregationRuleId.toString, projectId.toString, nullValue)
        val aggregationValues = new ApiAggregationValues(0, 1, 2, 3, "v1")
        val value = new ApiAggregationResult(nullValue, nullValue, aggregationValues)

        // WHEN: aggregation results is published
        publishAggregationResult(kafkaPublicationService, key, value)

        // THEN: the result is stored in database
        val createdAt = testClock.currentUtcOffsetDateTime()
        eventually {
          getAggregationResults(projectId, aggregationRuleId) shouldBe Seq(
            fromDataApiAggregationResult(key, value, createdAt, createdAt))
        }

        // WHEN: a new value is published
        val newUpdatedAt = testClock.moveTime()
        val aggregationValues2 = new ApiAggregationValues(10, 11, 12, 13, "v2")
        val value2 = new ApiAggregationResult(nullValue, nullValue, aggregationValues2)
        publishAggregationResult(kafkaPublicationService, key, value2)

        // THEN: a value in db is updated
        eventually {
          getAggregationResults(projectId, aggregationRuleId) shouldBe Seq(
            fromDataApiAggregationResult(key, value2, createdAt, newUpdatedAt))
        }
      }
    }

    "properly store results in database" in {
      withKafkaServices { kafkaPublicationService =>
        // GIVEN: Many aggregation results
        val projectId = ProjectId.random()
        val aggregationRuleId = AggregationRuleId.random()
        val groupByFieldValue = "field value 1"
        val windowRangeStartUTC = OffsetDateTimeUtils.nowUtc().withNano(0).minusDays(1)
        val windowRangeStart = windowRangeStartUTC.toInstant.toEpochMilli
        val windowRangeEndUTC = OffsetDateTimeUtils.nowUtc().withNano(0)
        val windowRangeEnd = windowRangeEndUTC.toInstant.toEpochMilli

        val projectId2 = ProjectId.random()
        val aggregationRuleId2 = AggregationRuleId.random()

        getAggregationResults(projectId, aggregationRuleId) shouldBe empty
        getAggregationResults(
          projectId,
          aggregationRuleId,
          Some(windowRangeStartUTC),
          Some(windowRangeEndUTC)) shouldBe empty

        val key = new ApiAggregationResultKey(aggregationRuleId.toString, projectId.toString, groupByFieldValue)
        val key2 = new ApiAggregationResultKey(aggregationRuleId.toString, projectId2.toString, groupByFieldValue)
        val key2B = new ApiAggregationResultKey(aggregationRuleId.toString, projectId2.toString, nullValue)
        val key3 = new ApiAggregationResultKey(aggregationRuleId2.toString, projectId.toString, groupByFieldValue)
        val key3B = new ApiAggregationResultKey(aggregationRuleId2.toString, projectId.toString, nullValue)
        val aggregation1Value = new ApiAggregationResult(windowRangeStart, windowRangeEnd, randomApiAggregationValues())
        val aggregation1Value2 =
          new ApiAggregationResult(windowRangeStart, windowRangeEnd, randomApiAggregationValues())
        val aggregation2Value = new ApiAggregationResult(windowRangeStart, windowRangeEnd, randomApiAggregationValues())
        val aggregation2Value2 =
          new ApiAggregationResult(windowRangeStart, windowRangeEnd, randomApiAggregationValues())
        val aggregation2SecondEntryValue =
          new ApiAggregationResult(windowRangeStart, windowRangeEnd, randomApiAggregationValues())
        val aggregation2WithDifferentRangeValue =
          new ApiAggregationResult(nullValue, nullValue, randomApiAggregationValues())
        val aggregation3Value = new ApiAggregationResult(windowRangeStart, windowRangeEnd, randomApiAggregationValues())
        val aggregation3SecondEntryValue =
          new ApiAggregationResult(windowRangeStart, windowRangeEnd, randomApiAggregationValues())
        val aggregation3SecondEntryValue2 =
          new ApiAggregationResult(windowRangeStart, windowRangeEnd, randomApiAggregationValues())
        val aggregation3WithDifferentRangeValue =
          new ApiAggregationResult(nullValue, nullValue, randomApiAggregationValues())

        // WHEN: aggregation results are published to Kafka
        publishAggregationResult(kafkaPublicationService, key, aggregation1Value)
        // this one will override the above one
        publishAggregationResult(kafkaPublicationService, key, aggregation1Value2)
        publishAggregationResult(kafkaPublicationService, key2, aggregation2Value)
        // this one has different dates range so it's a different aggregation
        publishAggregationResult(kafkaPublicationService, key2, aggregation2WithDifferentRangeValue)
        publishAggregationResult(kafkaPublicationService, key3, aggregation3Value)

        val createdAt = testClock.currentUtcOffsetDateTime()
        val updatedAt = createdAt
        val initialAggregation1Result = fromDataApiAggregationResult(key, aggregation1Value2, createdAt, updatedAt)
        val initialAggregation2Result = fromDataApiAggregationResult(key2, aggregation2Value, createdAt, updatedAt)
        val initialAggregation2WithDifferentRangeValue =
          fromDataApiAggregationResult(key2, aggregation2WithDifferentRangeValue, createdAt, updatedAt)
        val initialAggregation3Result = fromDataApiAggregationResult(key3, aggregation3Value, createdAt, updatedAt)
        // THEN: the newest versions are stored
        eventually {
          getAggregationResultsForAggregation(initialAggregation1Result) shouldBe Seq(initialAggregation1Result)
          getAggregationResultsForAggregation(initialAggregation2Result) shouldBe Seq(initialAggregation2Result)
          getAggregationResultsForAggregation(initialAggregation2WithDifferentRangeValue) shouldBe Seq(
            initialAggregation2WithDifferentRangeValue)
          getAggregationResultsForAggregation(initialAggregation3Result) shouldBe Seq(initialAggregation3Result)
        }

        // WHEN: we publish additional results for the same aggregation with different groupByFieldValue, new values for
        // the same groupByFieldValue and values for new aggregations
        val createdAt2 = testClock.moveTime()
        val updatedAt2 = createdAt2
        // overrides an old value
        publishAggregationResult(kafkaPublicationService, key2, aggregation2Value2)
        // second result for the same range
        publishAggregationResult(kafkaPublicationService, key2B, aggregation2SecondEntryValue)
        // will be overridden by the below entry
        publishAggregationResult(kafkaPublicationService, key3B, aggregation3SecondEntryValue)
        // second result or the same range
        publishAggregationResult(kafkaPublicationService, key3B, aggregation3SecondEntryValue2)
        // this one has different dates range
        publishAggregationResult(kafkaPublicationService, key3, aggregation3WithDifferentRangeValue)

        // THEN: the newest results are available; when the old values were replaced, the original cratedAt is stored
        eventually {
          getAggregationResultsForAggregation(initialAggregation1Result) shouldBe Seq(initialAggregation1Result)
          getAggregationResultsForAggregation(initialAggregation2Result) shouldBe Seq(
            fromDataApiAggregationResult(key2, aggregation2Value2, createdAt, updatedAt2),
            fromDataApiAggregationResult(key2B, aggregation2SecondEntryValue, createdAt2, updatedAt2))
          getAggregationResultsForAggregation(initialAggregation2WithDifferentRangeValue) shouldBe Seq(
            initialAggregation2WithDifferentRangeValue)
          getAggregationResultsForAggregation(initialAggregation3Result) shouldBe Seq(
            initialAggregation3Result,
            fromDataApiAggregationResult(key3B, aggregation3SecondEntryValue2, createdAt2, updatedAt2))
          val initialAggregation3WithDifferentRangeValue =
            fromDataApiAggregationResult(key3, aggregation3WithDifferentRangeValue, createdAt2, updatedAt2)
          getAggregationResultsForAggregation(initialAggregation3WithDifferentRangeValue) shouldBe Seq(
            initialAggregation3WithDifferentRangeValue)
        }
      }
    }
  }

  private def withKafkaServices[T](
      action: KafkaPublicationServiceImpl[ApiAggregationResultKey, ApiAggregationResult] => T): T = {
    ingestorModule.aggregationResultIngestor.start()
    val kafkaPublicationService = createKafkaPublicationService()
    try {
      action(kafkaPublicationService)
    } finally {
      kafkaPublicationService.stopGracefully()
    }
  }

  private def createKafkaPublicationService()
      : KafkaPublicationServiceImpl[ApiAggregationResultKey, ApiAggregationResult] = {
    val kafkaConfig = ingestorModule.config
    val kafkaProducerConfig = KafkaProducerConfig(
      kafkaConfig.topicName,
      kafkaConfig.bootstrapServers,
      kafkaConfig.serializer,
      ProducerConfig(
        acks = "1",
        clientId = UUID.randomUUID().toString,
        compressionType = "gzip",
        maxInFlightRequestsPerConnection = 1,
        maxNumberOfRetries = None,
        publicationTimeLimit = None))
    new KafkaPublicationServiceImpl[ApiAggregationResultKey, ApiAggregationResult](kafkaProducerConfig)
  }

  private def publishAggregationResult(
      kafkaPublicationService: KafkaPublicationServiceImpl[ApiAggregationResultKey, ApiAggregationResult],
      key: ApiAggregationResultKey,
      value: ApiAggregationResult) = {
    val publicationResult =
      Await.result(kafkaPublicationService.publish(key, Some(value)).value, awaitTimeout)
    publicationResult.isRight shouldBe true
  }

  private def getAggregationResultsForAggregation(
      aggregationResult: AggregationResultFromEvent): Seq[AggregationResultFromEvent] =
    getAggregationResults(
      aggregationResult.projectId,
      aggregationResult.aggregationRuleId,
      aggregationResult.windowRangeStart,
      aggregationResult.windowRangeEnd)

  private def getAggregationResults(
      projectId: ProjectId,
      aggregationRuleId: AggregationRuleId,
      windowRangeStartUTC: Option[OffsetDateTime] = None,
      windowRangeEndUTC: Option[OffsetDateTime] = None): Seq[AggregationResultFromEvent] = {
    Await
      .result(
        ingestorModule.aggregationResultRepository
          .getAggregationResultEntities(projectId, aggregationRuleId, windowRangeStartUTC, windowRangeEndUTC),
        awaitTimeout)
      .map(_.toAggregationResultFromEvent)
  }

  private def fromDataApiAggregationResult(
      key: ApiAggregationResultKey,
      value: ApiAggregationResult,
      createdAt: OffsetDateTime,
      updatedAt: OffsetDateTime): AggregationResultFromEvent =
    AggregationResultFromEvent.fromDataApiAggregationResult(key, value, createdAt, updatedAt).get

  private def randomApiAggregationValues(): ApiAggregationValues = apiAggregationValuesGen.sample.value
}
