package eeg.waysun.events.achievements.streams.dto

import eeg.waysun.events.achievements.Types

case class AchievementState(
    fired: Boolean = false,
    aggregates: Map[Types.Ids.AggregationRuleId, Types.AggregatedType.Wrapped] = Map(),
    definitionKey: Types.DefinitionType.KeyType,
    definition: Types.DefinitionType.ValueType)
