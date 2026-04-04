package eeg.waysun.events.achievements.conditions

import eeg.waysun.events.achievements.Types._

import scala.collection.JavaConverters._

case class AchievementConditionsSatisfiedCheck(achievementState: AchievementStateType.ValueType) extends Check {

  val aggregatedRuleIds = achievementState.aggregates.keys

  val definitionRuleIds = achievementState.definition.conditions.asScala.map(_.aggregationRuleId.toString)

  override def check: Boolean = aggregatedRuleIds.toSet == definitionRuleIds.toSet

}
