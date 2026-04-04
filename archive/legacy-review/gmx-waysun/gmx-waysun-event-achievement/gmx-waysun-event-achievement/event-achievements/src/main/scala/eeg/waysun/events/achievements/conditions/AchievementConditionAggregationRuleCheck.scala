package eeg.waysun.events.achievements.conditions

import eeg.waysun.events.achievements.Types.{AggregatedType, DefinitionType}
import org.apache.commons.lang3.StringUtils

case class AchievementConditionAggregationRuleCheck(
    condition: DefinitionType.ConditionType,
    event: AggregatedType.Wrapped)
    extends Check {

  override def check: Boolean = {
    val aggregationRuleId = event.key.getAggregationRuleId.toString
    val definitionAggregationRuleId = condition.getAggregationRuleId.toString
    StringUtils.equalsIgnoreCase(aggregationRuleId, definitionAggregationRuleId)
  }
}
