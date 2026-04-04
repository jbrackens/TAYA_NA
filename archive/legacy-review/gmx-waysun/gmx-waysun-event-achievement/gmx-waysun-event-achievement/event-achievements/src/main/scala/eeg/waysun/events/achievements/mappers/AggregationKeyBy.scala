package eeg.waysun.events.achievements.mappers

import eeg.waysun.events.achievements.Types

object AggregationKeyBy {

  def aggregationIdInCompany: Types.AggregatedType.Wrapped => Types.JoiningType.AggregationIdType = source =>
    new Types.JoiningType.AggregationIdType(
      projectId = source.key.getProjectId.toString,
      aggregationRuleId = source.key.getAggregationRuleId.toString)

}
