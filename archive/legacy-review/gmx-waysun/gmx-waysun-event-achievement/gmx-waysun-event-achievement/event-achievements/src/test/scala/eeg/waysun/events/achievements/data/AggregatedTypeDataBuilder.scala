package eeg.waysun.events.achievements.data

import eeg.waysun.events.achievements.Types.AggregatedType
import eeg.waysun.events.achievements.Types.Ids.ProjectId
import net.flipsports.gmx.streaming.common.conversion.DateFormats
import stella.dataapi.aggregation.AggregationValues

case class AggregatedTypeDataBuilder(
    projectId: ProjectId,
    aggregationRuleBuilder: AggregationRuleIdBuilder,
    aggregationGroupByFieldBuilder: AggregationGroupByFieldBuilder) {

  def next(
      aggregationValues: AggregationValues = new AggregationValues(0.0f, 1.0f, 2, 3.0f, "4"),
      groupBy: Option[String] = None): (AggregatedType.KeyType, AggregatedType.ValueType) = {
    val key = new AggregatedType.KeyType()
    key.setAggregationRuleId(aggregationRuleBuilder.id())
    key.setProjectId(projectId)
    key.setGroupByFieldValue(groupBy.getOrElse(aggregationGroupByFieldBuilder.groupBy()))

    val value = new AggregatedType.ValueType()
    value.setWindowRangeStartUTC(DateFormats.nowEpochInMiliAtUtc())
    value.setWindowRangeEndUTC(DateFormats.nowEpochInMiliAtUtc())
    value.setAggregations(aggregationValues)
    (key, value)
  }
}
