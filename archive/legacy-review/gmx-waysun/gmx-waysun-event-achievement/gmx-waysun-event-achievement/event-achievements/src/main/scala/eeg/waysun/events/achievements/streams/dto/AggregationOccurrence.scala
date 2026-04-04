package eeg.waysun.events.achievements.streams.dto

import eeg.waysun.events.achievements.Types.{AggregatedType, DefinitionType}
import net.flipsports.gmx.streaming.common.job.streams.dto.{KeyValue, State}

case class AggregationOccurrence(
    achievementDefinition: State[DefinitionType.KeyType, DefinitionType.ValueType],
    aggregation: KeyValue.KeyedElement[AggregatedType.KeyType, AggregatedType.ValueType])
