package eeg.waysun.events.achievements.data

import eeg.waysun.events.achievements.Types.DefinitionType
import stella.dataapi.achievement._

import java.util.UUID
import scala.collection.JavaConverters._

object DefinitionDataProvider
    extends DataProvider[(DefinitionType.KeyType, DefinitionType.ValueType), AchievementCondition] {

  override def buildFake(
      item: Int,
      eventName: String,
      projectId: String = UUID.randomUUID().toString,
      payloadData: Option[Seq[AchievementCondition]] = None): (DefinitionType.KeyType, DefinitionType.ValueType) = {

    val properPayloadData = payloadData match {
      case None =>
        Seq(new AchievementCondition(s"$eventName", "count", ConditionType.EQ, "1")).asJava
      case Some(conditions) if conditions.isEmpty => null
      case Some(conditions)                       => conditions.asJava
    }

    val key = new DefinitionType.KeyType

    key.setAchievementRuleId(s"achievementid-$item")
    key.setProjectId(projectId)

    val value = new DefinitionType.ValueType()
    value.setName(s"achievementid-super-$item")
    value.setActionType(ActionType.EVENT)
    value.setConditions(properPayloadData)
    value.setTriggerBehaviour(AchievementTriggerBehaviour.ALWAYS)
    (key, value)
  }
}
