package eeg.waysun.events.achievements.conditions

import eeg.waysun.events.achievements.Types.{AggregatedType, DefinitionType}

case class AchievementConfigurationMatchCheck(definition: DefinitionType.Stated, event: AggregatedType.Wrapped)
    extends Check {

  lazy val conditionsAreEmpty = AchievementConditionsEmptyCheck(definition)

  lazy val checkConditions = AchievementConditionMatchCheck(definition, event)

  override def check: Boolean = conditionsAreEmpty.check || checkConditions.check

}
