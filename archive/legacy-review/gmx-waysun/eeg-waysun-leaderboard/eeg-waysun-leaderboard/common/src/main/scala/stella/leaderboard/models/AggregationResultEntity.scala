package stella.leaderboard.models

import java.time.OffsetDateTime

import stella.common.models.Ids.ProjectId

import stella.leaderboard.models
import stella.leaderboard.models.Ids.AggregationResultId
import stella.leaderboard.models.Ids.AggregationRuleId

final case class AggregationResultEntity(
    id: AggregationResultId,
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

  def toAggregationResult(position: Int): AggregationResult = AggregationResult(
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

  // to be used in the tests
  def toAggregationResultFromEvent: AggregationResultFromEvent = models.AggregationResultFromEvent(
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
    createdAt = createdAt,
    updatedAt = updatedAt)
}
