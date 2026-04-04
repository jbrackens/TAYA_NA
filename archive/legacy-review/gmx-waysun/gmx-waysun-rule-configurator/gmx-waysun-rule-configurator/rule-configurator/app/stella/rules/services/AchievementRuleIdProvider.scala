package stella.rules.services

import stella.rules.models.Ids.AchievementConfigurationRuleId

trait AchievementRuleIdProvider {
  def generateId(): AchievementConfigurationRuleId
}

object RandomUuidAchievementRuleIdProvider extends AchievementRuleIdProvider {
  override def generateId(): AchievementConfigurationRuleId = AchievementConfigurationRuleId.random()
}
