package eeg.waysun.events.achievements.mappers

import eeg.waysun.events.achievements.Types._
import net.flipsports.gmx.streaming.common.job.streams.dto.{KeyValue, State}

object AggregationWithDefinitionOccurrenceMapper {

  def toAggregationWithDefinition(
      definitionItem: State[DefinitionType.KeyType, DefinitionType.ValueType],
      item: KeyValue.KeyedElement[AggregatedType.KeyType, AggregatedType.ValueType])
      : Option[AggregatedWithDefinitionType.ValueType] = {
    Some(new AggregatedWithDefinitionType.ValueType(aggregation = item, achievementDefinition = definitionItem))
  }
}
