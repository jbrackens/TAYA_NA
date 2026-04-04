package stella.leaderboard

import java.time.OffsetDateTime
import java.util.UUID

import stella.common.http.jwt.FullyPermissivePermissions
import stella.common.http.jwt.StellaAuthContext
import stella.common.models.Ids.ProjectId

import stella.leaderboard.models.AggregationResult
import stella.leaderboard.models.AggregationResultEntity
import stella.leaderboard.models.AggregationWindow
import stella.leaderboard.models.Ids.AggregationResultId
import stella.leaderboard.models.Ids.AggregationRuleId

object SampleObjectFactory {

  val testProjectId: ProjectId = ProjectId.random()

  val testAggregationRuleId: AggregationRuleId = AggregationRuleId.random()

  val testAuthContext: StellaAuthContext =
    StellaAuthContext(
      FullyPermissivePermissions,
      userId = UUID.randomUUID(),
      primaryProjectId = testProjectId,
      additionalProjectIds = Set.empty)

  val aggregationResultEntity: AggregationResultEntity = AggregationResultEntity(
    id = AggregationResultId(0),
    projectId = ProjectId.random(),
    aggregationRuleId = testAggregationRuleId,
    groupByFieldValue = "foo_value",
    windowRangeStart = None,
    windowRangeEnd = None,
    min = 1.1f,
    max = 2.2f,
    count = 3,
    sum = 4.4f,
    custom = "foo_custom_value",
    createdAt = OffsetDateTime.now().minusMinutes(3),
    updatedAt = OffsetDateTime.now().minusMinutes(2))

  val aggregationResultEntity2: AggregationResultEntity = AggregationResultEntity(
    id = AggregationResultId(1),
    projectId = ProjectId.random(),
    aggregationRuleId = AggregationRuleId.random(),
    groupByFieldValue = "bar_value",
    windowRangeStart = Some(OffsetDateTime.now().minusDays(10)),
    windowRangeEnd = Some(OffsetDateTime.now().minusDays(3)),
    min = 11.1f,
    max = 12.2f,
    count = 13,
    sum = 14.4f,
    custom = "bar_custom_value",
    createdAt = OffsetDateTime.now().minusMinutes(1),
    updatedAt = OffsetDateTime.now())

  val aggregationResult: AggregationResult = aggregationResultEntity.toAggregationResult(position = 7)

  val aggregationResult2: AggregationResult = aggregationResultEntity2.toAggregationResult(position = 8)

  val aggregationResultWindow: AggregationWindow =
    AggregationWindow(elements = 1, windowRangeStart = None, windowRangeEnd = None)

  val aggregationResultWindow2: AggregationWindow = AggregationWindow(
    elements = 4,
    windowRangeStart = Some(OffsetDateTime.now().minusMinutes(1)),
    windowRangeEnd = Some(OffsetDateTime.now()))
}
