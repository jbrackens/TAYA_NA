package stella.achievement.db

import java.time.OffsetDateTime

import scala.concurrent.ExecutionContext
import scala.concurrent.Future

import stella.common.http.AggregationWindow
import stella.common.models.Ids.ProjectId

import stella.achievement.models.AchievementEventEntityWithActionDetails
import stella.achievement.models.BaseFetchAchievementEventsParams
import stella.achievement.models.Ids.AchievementConfigurationRulePublicId

trait AchievementEventRepository {

  def getAggregationWindows(projectId: ProjectId, achievementRuleId: AchievementConfigurationRulePublicId)(implicit
      ec: ExecutionContext): Future[Seq[AggregationWindow]]

  def getAchievementEvents(baseParams: BaseFetchAchievementEventsParams, pageSize: Int, pageNumber: Int)(implicit
      ec: ExecutionContext): Future[Seq[AchievementEventEntityWithActionDetails]]

  def countAchievementEvents(
      projectId: ProjectId,
      achievementRuleId: AchievementConfigurationRulePublicId,
      groupByFieldValue: Option[String],
      windowRangeStart: Option[OffsetDateTime])(implicit ec: ExecutionContext): Future[Int]

  // for test purposes
  def createAchievementEvents(achievementEvents: Seq[AchievementEventEntityWithActionDetails])(implicit
      ec: ExecutionContext): Future[Unit]
}
