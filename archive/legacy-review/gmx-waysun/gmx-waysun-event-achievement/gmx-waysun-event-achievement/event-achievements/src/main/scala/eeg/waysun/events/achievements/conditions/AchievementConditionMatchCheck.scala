package eeg.waysun.events.achievements.conditions

import eeg.waysun.events.achievements.Types.{AggregatedType, DefinitionType}

import scala.collection.JavaConverters._

case class AchievementConditionMatchCheck(definition: DefinitionType.Stated, event: AggregatedType.Wrapped)
    extends Check {

  override def check: Boolean =
    definition.value.getConditions.asScala
      .filter(onlyConditionsForEventAggregationRuleId)
      .map(checkConditionIfValueConfigurationMatches)
      .reduceOption(_ && _)
      .getOrElse(false)

  def onlyConditionsForEventAggregationRuleId(condition: DefinitionType.ConditionType): Boolean =
    AchievementConditionAggregationRuleCheck(condition, event).check

  def checkConditionIfValueConfigurationMatches(condition: DefinitionType.ConditionType): Boolean =
    AchievementConditionValueMatchCheck(condition, event).check

}
