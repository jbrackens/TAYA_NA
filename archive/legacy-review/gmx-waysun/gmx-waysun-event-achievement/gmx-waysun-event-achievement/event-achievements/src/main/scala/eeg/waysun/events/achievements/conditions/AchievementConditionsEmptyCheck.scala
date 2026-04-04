package eeg.waysun.events.achievements.conditions

import eeg.waysun.events.achievements.Types.DefinitionType

case class AchievementConditionsEmptyCheck(achievementDefinition: DefinitionType.Stated) extends Check {

  override def check: Boolean = {
    val achievementDefinitionValue = achievementDefinition.value
    achievementDefinitionValue.getConditions.isEmpty
  }

}
