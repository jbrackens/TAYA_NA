package stella.leaderboard.server.it.routes

import java.time.OffsetDateTime
import java.util.UUID

import scala.concurrent.Await
import scala.concurrent.ExecutionContext
import scala.concurrent.duration.FiniteDuration

import org.scalatest.Assertions

import stella.common.core.OffsetDateTimeUtils
import stella.common.models.Ids.ProjectId

import stella.leaderboard.db.AggregationResultRepository
import stella.leaderboard.models.AggregationResultFromEvent
import stella.leaderboard.models.Ids.AggregationRuleId

private final case class WindowRange(start: Option[OffsetDateTime], end: Option[OffsetDateTime])

class TestData extends Assertions {

  val projectId1: ProjectId = ProjectId.random()
  val projectId2: ProjectId = ProjectId.random()
  val aggregationRuleId1: AggregationRuleId = AggregationRuleId(UUID.randomUUID())
  val aggregationRuleId2: AggregationRuleId = AggregationRuleId(UUID.randomUUID())

  private val groupByFieldValue1 = "val1"
  private val groupByFieldValue2 = "val2"
  private val groupByFieldValue3 = "val3"
  private val groupByFieldValue4 = "val4"
  private val groupByFieldValue5 = "val5"

  private val dateTime5 = OffsetDateTimeUtils.nowUtc()
  private val dateTime1 = dateTime5.minusDays(24)
  private val dateTime2 = dateTime5.minusDays(17)
  private val dateTime3 = dateTime5.minusDays(10)
  private val dateTime4 = dateTime5.minusDays(3)
  private val windowRange1 = WindowRange(None, None)
  private val windowRange2 = WindowRange(Some(dateTime1), Some(dateTime2))
  private val windowRange3 = WindowRange(Some(dateTime2), Some(dateTime3))
  private val windowRange4 = WindowRange(Some(dateTime3), Some(dateTime4))
  private val windowRange5 = WindowRange(Some(dateTime4), Some(dateTime5))

  object project1Rule1Results {
    private[TestData] def allResultsToCreate = Seq(
      aggregation1Result,
      aggregation1Result2,
      aggregation1Result3,
      aggregation1Result4,
      aggregation1Result5,
      aggregation2Result,
      aggregation3Result,
      aggregation4Result,
      aggregation5Result)

    val aggregation1Result: AggregationResultFromEvent = AggregationResultFromEvent(
      projectId = projectId1,
      aggregationRuleId = aggregationRuleId1,
      groupByFieldValue = groupByFieldValue1,
      windowRangeStart = windowRange1.start,
      windowRangeEnd = windowRange1.end,
      min = 1.1f,
      max = 99.9f,
      count = 101,
      sum = 199.8f,
      custom = "custom1",
      createdAt = dateTime1,
      updatedAt = dateTime1)

    val aggregation1Result2: AggregationResultFromEvent = AggregationResultFromEvent(
      projectId = projectId1,
      aggregationRuleId = aggregationRuleId1,
      groupByFieldValue = groupByFieldValue2,
      windowRangeStart = windowRange1.start,
      windowRangeEnd = windowRange1.end,
      min = 1.1f,
      max = 99.9f,
      count = 80,
      sum = 199.8f,
      custom = "custom2",
      createdAt = dateTime1,
      updatedAt = dateTime2)

    val aggregation1Result3: AggregationResultFromEvent = AggregationResultFromEvent(
      projectId = projectId1,
      aggregationRuleId = aggregationRuleId1,
      groupByFieldValue = groupByFieldValue3,
      windowRangeStart = windowRange1.start,
      windowRangeEnd = windowRange1.end,
      min = 1.3f,
      max = 99.7f,
      count = 102,
      sum = 199.5f,
      custom = "custom3",
      createdAt = dateTime1,
      updatedAt = dateTime3)

    val aggregation1Result4: AggregationResultFromEvent = AggregationResultFromEvent(
      projectId = projectId1,
      aggregationRuleId = aggregationRuleId1,
      groupByFieldValue = groupByFieldValue4,
      windowRangeStart = windowRange1.start,
      windowRangeEnd = windowRange1.end,
      min = 1.4f,
      max = 99.6f,
      count = 105,
      sum = 199.7f,
      custom = "custom4",
      createdAt = dateTime2,
      updatedAt = dateTime2)

    val aggregation1Result5: AggregationResultFromEvent = AggregationResultFromEvent(
      projectId = projectId1,
      aggregationRuleId = aggregationRuleId1,
      groupByFieldValue = groupByFieldValue5,
      windowRangeStart = windowRange1.start,
      windowRangeEnd = windowRange1.end,
      min = 1.5f,
      max = 99.5f,
      count = 104,
      sum = 199.6f,
      custom = "custom5",
      createdAt = dateTime3,
      updatedAt = dateTime3)

    val aggregation2Result: AggregationResultFromEvent = AggregationResultFromEvent(
      projectId = projectId1,
      aggregationRuleId = aggregationRuleId1,
      groupByFieldValue = groupByFieldValue1,
      windowRangeStart = windowRange2.start,
      windowRangeEnd = windowRange2.end,
      min = 2.1f,
      max = 298.1f,
      count = 204,
      sum = 299.1f,
      custom = "customB",
      createdAt = dateTime2,
      updatedAt = dateTime3)

    val aggregation3Result: AggregationResultFromEvent = AggregationResultFromEvent(
      projectId = projectId1,
      aggregationRuleId = aggregationRuleId1,
      groupByFieldValue = groupByFieldValue2,
      windowRangeStart = windowRange3.start,
      windowRangeEnd = windowRange3.end,
      min = 2.1f,
      max = 298.1f,
      count = 204,
      sum = 299.1f,
      custom = "customC",
      createdAt = dateTime2,
      updatedAt = dateTime3)

    val aggregation4Result: AggregationResultFromEvent = AggregationResultFromEvent(
      projectId = projectId1,
      aggregationRuleId = aggregationRuleId1,
      groupByFieldValue = groupByFieldValue3,
      windowRangeStart = windowRange4.start,
      windowRangeEnd = windowRange4.end,
      min = 3.1f,
      max = 398.1f,
      count = 304,
      sum = 399.1f,
      custom = "customD",
      createdAt = dateTime2,
      updatedAt = dateTime3)

    val aggregation5Result: AggregationResultFromEvent = AggregationResultFromEvent(
      projectId = projectId1,
      aggregationRuleId = aggregationRuleId1,
      groupByFieldValue = groupByFieldValue4,
      windowRangeStart = windowRange5.start,
      windowRangeEnd = windowRange5.end,
      min = 4.1f,
      max = 498.1f,
      count = 404,
      sum = 499.1f,
      custom = "customE",
      createdAt = dateTime2,
      updatedAt = dateTime3)
  }

  object project1Rule2Results {
    private[TestData] def allResultsToCreate = Seq(aggregationResult)

    val aggregationResult: AggregationResultFromEvent = AggregationResultFromEvent(
      projectId = projectId1,
      aggregationRuleId = aggregationRuleId2,
      groupByFieldValue = groupByFieldValue1,
      windowRangeStart = windowRange1.start,
      windowRangeEnd = windowRange1.end,
      min = 1.2f,
      max = 99.8f,
      count = 103,
      sum = 199.9f,
      custom = "customI",
      createdAt = dateTime1,
      updatedAt = dateTime1)
  }

  object project2Rule1Results {
    private[TestData] def allResultsToCreate = Seq(aggregationResult)

    val aggregationResult: AggregationResultFromEvent = AggregationResultFromEvent(
      projectId = projectId2,
      aggregationRuleId = aggregationRuleId1,
      groupByFieldValue = groupByFieldValue3,
      windowRangeStart = windowRange4.start,
      windowRangeEnd = windowRange4.end,
      min = 3.1f,
      max = 398.1f,
      count = 304,
      sum = 399.1f,
      custom = "customII",
      createdAt = dateTime2,
      updatedAt = dateTime3)
  }

  object project2Rule2Results {
    private[TestData] def allResultsToCreate = Seq(aggregationResult)

    val aggregationResult: AggregationResultFromEvent = AggregationResultFromEvent(
      projectId = projectId2,
      aggregationRuleId = aggregationRuleId2,
      groupByFieldValue = groupByFieldValue4,
      windowRangeStart = windowRange5.start,
      windowRangeEnd = windowRange5.end,
      min = 4.1f,
      max = 498.1f,
      count = 404,
      sum = 499.1f,
      custom = "customIII",
      createdAt = dateTime3,
      updatedAt = dateTime3)
  }

  def populateDatabaseWithDefaultData(
      repository: AggregationResultRepository,
      resultPublicationTimeLimit: FiniteDuration)(implicit ec: ExecutionContext): Unit = {
    val allResultsToCreate = project1Rule1Results.allResultsToCreate ++ project1Rule2Results.allResultsToCreate ++
      project2Rule1Results.allResultsToCreate ++ project2Rule2Results.allResultsToCreate
    Await.result(
      repository.createAggregationResults(newAggregationResults = allResultsToCreate, aggregationResultsToUpdate = Nil),
      resultPublicationTimeLimit)
  }

  def storeNewResult1ForProject(
      projectId: ProjectId,
      repository: AggregationResultRepository,
      resultPublicationTimeLimit: FiniteDuration)(implicit ec: ExecutionContext): AggregationResultFromEvent = {
    val res = project1Rule1Results.aggregation1Result.copy(projectId = projectId)
    storeSingleNewResult(res, repository, resultPublicationTimeLimit)
  }

  def storeNewResult2ForProject(
      projectId: ProjectId,
      repository: AggregationResultRepository,
      resultPublicationTimeLimit: FiniteDuration)(implicit ec: ExecutionContext): AggregationResultFromEvent = {
    val res = project1Rule1Results.aggregation1Result2.copy(projectId = projectId)
    storeSingleNewResult(res, repository, resultPublicationTimeLimit)
  }

  private def storeSingleNewResult(
      res: AggregationResultFromEvent,
      repository: AggregationResultRepository,
      resultPublicationTimeLimit: FiniteDuration)(implicit ec: ExecutionContext): AggregationResultFromEvent = {
    Await.result(
      repository.createAggregationResults(newAggregationResults = Seq(res), aggregationResultsToUpdate = Nil),
      resultPublicationTimeLimit)
    res
  }
}
