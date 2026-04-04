package eeg.waysun.events.achievements.data

import eeg.waysun.events.achievements.Types.DefinitionType
import eeg.waysun.events.achievements.Types.Ids.ProjectId
import eeg.waysun.events.achievements.operations.AggregationFunctions
import stella.dataapi.achievement.{AchievementCondition, AchievementTriggerBehaviour, ActionType, ConditionType}

import scala.collection.JavaConverters._

case class AchievementDefinitionBuilder(
    projectId: ProjectId,
    achievementRuleIdBuilder: AchievementRuleIdBuilder,
    aggregationRuleIdBuilder: AggregationRuleIdBuilder,
    aggregationGroupByFieldBuilder: AggregationGroupByFieldBuilder) {

  def build(
      eventName: String,
      conditions: Option[Seq[DefinitionType.ConditionType]] = None,
      policy: AchievementTriggerBehaviour = AchievementTriggerBehaviour.ALWAYS)
      : (DefinitionType.KeyType, DefinitionType.ValueType) = {
    val properPayloadData = conditions match {
      case None =>
        Seq(
          new AchievementCondition(
            aggregationRuleIdBuilder.id(),
            AggregationFunctions.max,
            ConditionType.EQ,
            "1")).asJava
      case Some(conditions) if conditions.isEmpty => null
      case Some(conditions)                       => conditions.asJava
    }

    val key = new DefinitionType.KeyType
    key.setAchievementRuleId(achievementRuleIdBuilder.id())
    key.setProjectId(projectId)

    val value = new DefinitionType.ValueType()
    value.setName(s"achievement-name-$eventName")
    value.setActionType(ActionType.EVENT)
    value.setConditions(properPayloadData)
    value.setTriggerBehaviour(policy)
    (key, value)
  }

}
