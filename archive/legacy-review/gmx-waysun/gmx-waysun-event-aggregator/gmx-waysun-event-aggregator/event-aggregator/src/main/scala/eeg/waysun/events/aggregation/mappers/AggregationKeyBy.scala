package eeg.waysun.events.aggregation.mappers

import eeg.waysun.events.aggregation.Types

object AggregationKeyBy {

  def aggregationOccurrenceAsKey: Types.AggregationOccurrence.KeyedType => Types.AggregationResult.KeyType = {
    occurrence: Types.AggregationOccurrence.KeyedType =>
      val key = new Types.AggregationResult.KeyType()
      key.setProjectId(occurrence.key.projectId)
      key.setAggregationRuleId(occurrence.value.aggregationDefinitionRuleId)
      key.setGroupByFieldValue(occurrence.value.aggregationGroupByFieldValue)
      key
  }

  def asSinkType: Types.AggregationResult.KeyedType => Types.AggregationResult.SinkType = { source =>
    new Types.AggregationResult.SinkType(source.key, source.value)
  }
}
