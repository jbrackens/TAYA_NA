package stella.achievement.models

import java.time.OffsetDateTime

import stella.common.models.Ids.ProjectId

import stella.achievement.models.Ids.AchievementConfigurationRulePublicId

final case class BaseFetchAchievementEventsParams(
    projectId: ProjectId,
    achievementRuleId: AchievementConfigurationRulePublicId,
    groupByFieldValue: Option[String],
    windowRangeStart: Option[OffsetDateTime],
    orderBy: OrderByFilters) {

  def withRemovedOverriddenFilters: BaseFetchAchievementEventsParams =
    copy(orderBy = OrderByFilters(OrderByFilters.removeOverriddenFilters(orderBy.filters)))
}
