package eeg.waysun.events.achievements.mappers

import eeg.waysun.events.achievements.Types

object AchievementKeyBy {

  def achievementIdInCompany: Types.AggregatedWithDefinitionType.OutputType => Types.AchievementStateType.KeyType =
    source =>
      new Types.AchievementStateType.KeyType(
        projectId = source.result.key.projectId,
        achievementRuleId = source.result.key.achievementRuleId)
}
