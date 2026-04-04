package stella.achievement.services

import java.time.OffsetDateTime

import scala.concurrent.ExecutionContext
import scala.concurrent.Future

import stella.common.http.AggregationWindow
import stella.common.http.PaginatedResult
import stella.common.models.Ids.ProjectId

import stella.achievement.db.AchievementEventRepository
import stella.achievement.models.AchievementEvent
import stella.achievement.models.BaseFetchAchievementEventsParams
import stella.achievement.models.Ids.AchievementConfigurationRulePublicId

class AchievementBoundedContextImpl(repository: AchievementEventRepository) extends AchievementBoundedContext {

  override def getAggregationWindows(projectId: ProjectId, achievementRuleId: AchievementConfigurationRulePublicId)(
      implicit ec: ExecutionContext): Future[Seq[AggregationWindow]] =
    repository.getAggregationWindows(projectId, achievementRuleId)

  override def getAchievementEventsPage(
      baseParams: BaseFetchAchievementEventsParams,
      pageSize: Int,
      pageNumber: Int,
      shouldCountPages: Boolean)(implicit ec: ExecutionContext): Future[PaginatedResult[AchievementEvent]] =
    for {
      numberOfPagesOpt <-
        countPagesIfRequested(
          baseParams.projectId,
          baseParams.achievementRuleId,
          baseParams.groupByFieldValue,
          baseParams.windowRangeStart,
          pageSize,
          shouldCountPages)
      achievementEvents <-
        getResultsForPage(baseParams, pageSize, pageNumber, numberOfPagesOpt)
    } yield PaginatedResult[AchievementEvent](pageNumber, numberOfPagesOpt, pageSize, achievementEvents)

  private def countPages(
      projectId: ProjectId,
      achievementRuleId: AchievementConfigurationRulePublicId,
      groupByFieldValue: Option[String],
      windowRangeStart: Option[OffsetDateTime],
      pageSize: Int)(implicit ec: ExecutionContext): Future[Int] =
    repository
      .countAchievementEvents(projectId, achievementRuleId, groupByFieldValue, windowRangeStart)
      .map(numberOfRows => (numberOfRows / pageSize.toFloat).ceil.toInt)

  private def countPagesIfRequested(
      projectId: ProjectId,
      achievementRuleId: AchievementConfigurationRulePublicId,
      groupByFieldValue: Option[String],
      windowRangeStart: Option[OffsetDateTime],
      pageSize: Int,
      shouldCountPages: Boolean)(implicit ec: ExecutionContext): Future[Option[Int]] =
    if (shouldCountPages)
      countPages(projectId, achievementRuleId, groupByFieldValue, windowRangeStart, pageSize).map(Some(_))
    else Future.successful(None)

  private def getResultsForPage(
      baseParams: BaseFetchAchievementEventsParams,
      pageSize: Int,
      pageNumber: Int,
      numberOfPagesOpt: Option[Int])(implicit ec: ExecutionContext): Future[Seq[AchievementEvent]] =
    if (checkPageDoesNotExist(pageNumber, numberOfPagesOpt)) Future.successful(Nil)
    else
      repository.getAchievementEvents(baseParams, pageSize, pageNumber).map(_.map(_.toAchievementEvent))

  private def checkPageDoesNotExist(pageNumber: Int, numberOfPages: Option[Int]): Boolean =
    numberOfPages.exists(n => n == 0 || n < pageNumber)
}
