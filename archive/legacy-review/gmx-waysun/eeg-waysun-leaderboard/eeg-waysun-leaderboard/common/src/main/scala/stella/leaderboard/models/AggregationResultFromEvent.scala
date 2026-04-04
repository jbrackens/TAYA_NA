package stella.leaderboard.models

import java.time.Instant
import java.time.OffsetDateTime
import java.time.ZoneOffset
import java.util.UUID

import scala.util.Failure
import scala.util.Try

import stella.common.models.Ids._
import stella.dataapi.aggregation.{AggregationResult => ApiAggregationResult}
import stella.dataapi.aggregation.{AggregationResultKey => ApiAggregationResultKey}

import stella.leaderboard.models.Ids._

final case class AggregationResultFromEvent(
    projectId: ProjectId,
    aggregationRuleId: AggregationRuleId,
    groupByFieldValue: String,
    windowRangeStart: Option[OffsetDateTime],
    windowRangeEnd: Option[OffsetDateTime],
    min: Float,
    max: Float,
    count: Int,
    sum: Float,
    custom: String,
    createdAt: OffsetDateTime,
    updatedAt: OffsetDateTime) {

  def toAggregationResult(position: Int): AggregationResult =
    AggregationResult(
      position = position,
      groupByFieldValue = groupByFieldValue,
      windowRangeStart = windowRangeStart,
      windowRangeEnd = windowRangeEnd,
      min = min,
      max = max,
      count = count,
      sum = sum,
      custom = custom,
      createdAt = createdAt,
      updatedAt = updatedAt)

  def toAggregationResultEntity(
      id: AggregationResultId,
      createdAtOverride: Option[OffsetDateTime] = None): AggregationResultEntity = AggregationResultEntity(
    id = id,
    projectId = projectId,
    aggregationRuleId = aggregationRuleId,
    groupByFieldValue = groupByFieldValue,
    windowRangeStart = windowRangeStart,
    windowRangeEnd = windowRangeEnd,
    min = min,
    max = max,
    count = count,
    sum = sum,
    custom = custom,
    createdAt = createdAtOverride.getOrElse(createdAt),
    updatedAt = updatedAt)
}

object AggregationResultFromEvent {
  private val maxGroupByFieldValueLength = 250
  private val maxCustomValueLength = 250
  private val defaultGroupByFieldValue = ""

  def fromDataApiAggregationResult(
      apiAggregationResultKey: ApiAggregationResultKey,
      apiAggregationResult: ApiAggregationResult,
      createdAt: OffsetDateTime,
      updatedAt: OffsetDateTime): Try[AggregationResultFromEvent] = {
    val values = apiAggregationResult.getAggregations
    val groupByFieldValue =
      Option(apiAggregationResultKey.getGroupByFieldValue).map(_.toString).getOrElse(defaultGroupByFieldValue)
    val customValue = values.getCustom.toString
    if (groupByFieldValue.length > maxGroupByFieldValueLength)
      Failure(new IllegalArgumentException(
        s"'groupByFieldValue' can have at most $maxGroupByFieldValueLength chars, but '$groupByFieldValue' has ${groupByFieldValue.length} chars"))
    else if (customValue.length > maxCustomValueLength)
      Failure(new IllegalArgumentException(
        s"'custom' field can have at most $maxCustomValueLength chars, but '$customValue` has ${customValue.length} chars"))
    else
      Try {
        val projectId = ProjectId(UUID.fromString(apiAggregationResultKey.getProjectId.toString))
        val aggregationRuleId =
          AggregationRuleId(UUID.fromString(apiAggregationResultKey.getAggregationRuleId.toString))
        AggregationResultFromEvent(
          projectId = projectId,
          aggregationRuleId = aggregationRuleId,
          groupByFieldValue = groupByFieldValue,
          windowRangeStart = Option(apiAggregationResult.getWindowRangeStartUTC).map(toOffsetDateTime(_)),
          windowRangeEnd = Option(apiAggregationResult.getWindowRangeEndUTC).map(toOffsetDateTime(_)),
          min = values.getMin,
          max = values.getMax,
          count = values.getCount,
          sum = values.getSum,
          custom = customValue,
          createdAt = createdAt,
          updatedAt = updatedAt)
      }
  }

  private def toOffsetDateTime(millis: Long) = OffsetDateTime.ofInstant(Instant.ofEpochMilli(millis), ZoneOffset.UTC)
}
