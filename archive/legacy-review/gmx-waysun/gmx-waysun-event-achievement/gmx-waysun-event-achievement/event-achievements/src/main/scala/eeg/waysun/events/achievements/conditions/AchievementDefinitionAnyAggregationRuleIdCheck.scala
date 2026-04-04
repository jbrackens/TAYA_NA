package eeg.waysun.events.achievements.conditions

import eeg.waysun.events.achievements.Types._

import scala.collection.JavaConverters._

case class AchievementDefinitionAnyAggregationRuleIdCheck(
    currentKey: JoiningType.AggregationIdType,
    cacheValue: DefinitionType.ValueType)
    extends Check {

  def check: Boolean =
    cacheValue.getConditions.asScala.map(_.aggregationRuleId.toString).contains(currentKey.aggregationRuleId)
}

object AchievementDefinitionAnyAggregationRuleIdCheck {

  def apply(
      currentKey: JoiningType.AggregationIdType,
      cacheValue: DefinitionType.Source): AchievementDefinitionAnyAggregationRuleIdCheck =
    new AchievementDefinitionAnyAggregationRuleIdCheck(currentKey, cacheValue.f1)
}
