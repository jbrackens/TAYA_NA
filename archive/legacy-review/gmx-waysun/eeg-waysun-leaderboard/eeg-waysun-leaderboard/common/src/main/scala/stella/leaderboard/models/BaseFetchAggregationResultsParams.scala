package stella.leaderboard.models

import java.time.OffsetDateTime

import stella.common.models.Ids.ProjectId

import stella.leaderboard.models.Ids.AggregationRuleId

final case class BaseFetchAggregationResultsParams(
    projectId: ProjectId,
    aggregationRuleId: AggregationRuleId,
    windowRangeStart: Option[OffsetDateTime],
    orderBy: OrderByFilters,
    positionType: PositionType) {

  def withRemovedOverriddenFilters: BaseFetchAggregationResultsParams =
    copy(orderBy = OrderByFilters(OrderByFilters.removeOverriddenFilters(orderBy.filters)))
}
