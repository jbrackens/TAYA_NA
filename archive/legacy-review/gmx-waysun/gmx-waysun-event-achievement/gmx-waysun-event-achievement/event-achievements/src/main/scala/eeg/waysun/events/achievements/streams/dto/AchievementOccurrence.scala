package eeg.waysun.events.achievements.streams.dto

import eeg.waysun.events.achievements.Types

final case class AchievementOccurrence(
    fired: Boolean,
    aggregations: Seq[Types.AggregatedType.Source],
    definition: Types.DefinitionType.ValueType,
    definitionKey: Types.DefinitionType.KeyType)
    extends Serializable

object AchievementOccurrence {

  def first(
      aggregations: Seq[Types.AggregatedType.Source],
      definition: Types.DefinitionType.ValueType,
      definitionKey: Types.DefinitionType.KeyType): AchievementOccurrence =
    new AchievementOccurrence(false, aggregations, definition, definitionKey)

  def next(
      aggregations: Seq[Types.AggregatedType.Source],
      definition: Types.DefinitionType.ValueType,
      definitionKey: Types.DefinitionType.KeyType): AchievementOccurrence =
    new AchievementOccurrence(true, aggregations, definition, definitionKey)

}
