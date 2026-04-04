package stella.achievement.services

import scala.concurrent.ExecutionContext
import scala.concurrent.Future

import stella.common.http.AggregationWindow
import stella.common.http.PaginatedResult
import stella.common.http.jwt.Permission
import stella.common.models.Ids.ProjectId

import stella.achievement.models.AchievementEvent
import stella.achievement.models.BaseFetchAchievementEventsParams
import stella.achievement.models.Ids.AchievementConfigurationRulePublicId

trait AchievementBoundedContext {

  def getAggregationWindows(projectId: ProjectId, achievementRuleId: AchievementConfigurationRulePublicId)(implicit
      ec: ExecutionContext): Future[Seq[AggregationWindow]]

  def getAchievementEventsPage(
      baseParams: BaseFetchAchievementEventsParams,
      pageSize: Int,
      pageNo: Int,
      countPages: Boolean)(implicit ec: ExecutionContext): Future[PaginatedResult[AchievementEvent]]
}

object AchievementBoundedContext {

  object AggregationWindowsReadPermission extends Permission {
    override val value: String = "achievements:window:read"
  }

  object AchievementEventsReadPermission extends Permission {
    override val value: String = "achievements:read"
  }
}
