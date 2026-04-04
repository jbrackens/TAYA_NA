package eeg.waysun.events.achievements.streams.dto

import eeg.waysun.events.achievements.Types

final case class AchievementRuleInCompany(
    projectId: Types.Ids.ProjectId,
    achievementRuleId: Types.Ids.AchievementRuleId)
