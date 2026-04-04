package stella.leaderboard.services

import java.time.OffsetDateTime

import scala.concurrent.ExecutionContext
import scala.concurrent.Future

import cats.implicits.toTraverseOps

import stella.common.http.PaginatedResult
import stella.common.models.Ids._

import stella.leaderboard.db.AggregationResultRepository
import stella.leaderboard.models.AggregationResult
import stella.leaderboard.models.AggregationResultFromEvent
import stella.leaderboard.models.AggregationWindow
import stella.leaderboard.models.BaseFetchAggregationResultsParams
import stella.leaderboard.models.Ids._

class LeaderboardBoundedContextImpl(repository: AggregationResultRepository) extends LeaderboardBoundedContext {
  import LeaderboardBoundedContextImpl.getRidOfOutdatedAggregationResults

  override def getAggregationWindows(projectId: ProjectId, aggregationRuleId: AggregationRuleId)(implicit
      ec: ExecutionContext): Future[Seq[AggregationWindow]] =
    repository.getAggregationWindows(projectId, aggregationRuleId)

  override def getAggregationResultsPage(
      baseParams: BaseFetchAggregationResultsParams,
      pageSize: Int,
      pageNumber: Int,
      shouldCountPages: Boolean)(implicit ec: ExecutionContext): Future[PaginatedResult[AggregationResult]] =
    for {
      numberOfPagesOpt <-
        countPagesIfRequested(
          baseParams.projectId,
          baseParams.aggregationRuleId,
          baseParams.windowRangeStart,
          pageSize,
          shouldCountPages)
      aggregationResults <-
        getResultsForPage(baseParams, pageSize, pageNumber, numberOfPagesOpt)
    } yield PaginatedResult[AggregationResult](pageNumber, numberOfPagesOpt, pageSize, aggregationResults)

  override def getAggregationResultNeighbors(
      baseParams: BaseFetchAggregationResultsParams,
      neighborsSize: Int,
      fieldValue: String)(implicit ec: ExecutionContext): Future[Seq[AggregationResult]] =
    repository.getAggregationResultNeighbors(baseParams, neighborsSize, fieldValue)

  def getAggregationResultsForValues(baseParams: BaseFetchAggregationResultsParams, fieldValues: Seq[String])(implicit
      ec: ExecutionContext): Future[Seq[AggregationResult]] =
    repository.getAggregationResultsForValues(baseParams, fieldValues)

  override def storeAggregationResults(aggregationResults: Seq[AggregationResultFromEvent])(implicit
      ec: ExecutionContext): Future[Int] = {
    val latestAggregationResults = getRidOfOutdatedAggregationResults(aggregationResults)
    for {
      aggregationResultsWithDetailsFromDb <- latestAggregationResults.traverse(res =>
        repository
          .getAggregationResultInfo(
            res.projectId,
            res.aggregationRuleId,
            res.groupByFieldValue,
            res.windowRangeStart,
            res.windowRangeEnd)
          .map(id => res -> id))
      (newAggregationResults, aggregationResultsToUpdate) = aggregationResultsWithDetailsFromDb.partitionMap {
        case (aggregationResult, Some((aggregationResultId, createdAt))) =>
          Right(aggregationResult.toAggregationResultEntity(aggregationResultId, Some(createdAt)))
        case (aggregationResult, None) => Left(aggregationResult)
      }
      _ <- repository.createAggregationResults(newAggregationResults, aggregationResultsToUpdate)
    } yield {
      latestAggregationResults.size
    }
  }

  private def countPages(
      projectId: ProjectId,
      aggregationRuleId: AggregationRuleId,
      windowRangeStart: Option[OffsetDateTime],
      pageSize: Int)(implicit ec: ExecutionContext): Future[Int] =
    repository
      .countAggregationResults(projectId, aggregationRuleId, windowRangeStart)
      .map(numberOfRows => (numberOfRows / pageSize.toFloat).ceil.toInt)

  private def countPagesIfRequested(
      projectId: ProjectId,
      aggregationRuleId: AggregationRuleId,
      windowRangeStart: Option[OffsetDateTime],
      pageSize: Int,
      shouldCountPages: Boolean)(implicit ec: ExecutionContext): Future[Option[Int]] =
    if (shouldCountPages)
      countPages(projectId, aggregationRuleId, windowRangeStart, pageSize).map(Some(_))
    else Future.successful(None)

  private def getResultsForPage(
      baseParams: BaseFetchAggregationResultsParams,
      pageSize: Int,
      pageNumber: Int,
      numberOfPagesOpt: Option[Int])(implicit ec: ExecutionContext): Future[Seq[AggregationResult]] =
    if (checkPageDoesNotExist(pageNumber, numberOfPagesOpt)) Future.successful(Nil)
    else
      repository.getAggregationResults(baseParams, pageSize, pageNumber)

  private def checkPageDoesNotExist(pageNumber: Int, numberOfPages: Option[Int]): Boolean =
    numberOfPages.exists(n => n == 0 || n < pageNumber)
}

object LeaderboardBoundedContextImpl {
  // In case of the results which will be stored in the same row in the database, we want to keep only the last one.
  // There's no point to store an entry in the database and immediately replace it.
  private[services] def getRidOfOutdatedAggregationResults(
      aggregationResults: Seq[AggregationResultFromEvent]): Seq[AggregationResultFromEvent] = aggregationResults.reverse
    .distinctBy(res =>
      (res.projectId, res.aggregationRuleId, res.groupByFieldValue, res.windowRangeStart, res.windowRangeEnd))
    .reverse
}
