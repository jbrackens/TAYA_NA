package stella.leaderboard.db

import java.time.OffsetDateTime

import scala.concurrent.ExecutionContext
import scala.concurrent.Future

import stella.common.models.Ids._

import stella.leaderboard.db.AggregationResultRepository.IdAndCreatedAtPair
import stella.leaderboard.models.Ids._
import stella.leaderboard.models._

trait AggregationResultRepository {

  def getAggregationWindows(projectId: ProjectId, aggregationRuleId: AggregationRuleId)(implicit
      ec: ExecutionContext): Future[Seq[AggregationWindow]]

  def getAggregationResults(baseParams: BaseFetchAggregationResultsParams, pageSize: Int, pageNumber: Int)(implicit
      ec: ExecutionContext): Future[Seq[AggregationResult]]

  def countAggregationResults(
      projectId: ProjectId,
      aggregationRuleId: AggregationRuleId,
      windowRangeStart: Option[OffsetDateTime])(implicit ec: ExecutionContext): Future[Int]

  def getAggregationResultNeighbors(
      baseParams: BaseFetchAggregationResultsParams,
      neighborsSize: Int,
      fieldValue: String)(implicit ec: ExecutionContext): Future[Seq[AggregationResult]]

  def getAggregationResultsForValues(baseParams: BaseFetchAggregationResultsParams, fieldValues: Seq[String])(implicit
      ec: ExecutionContext): Future[Seq[AggregationResult]]

  // for tests
  def getAggregationResultEntities(
      projectId: ProjectId,
      aggregationRuleId: AggregationRuleId,
      windowRangeStart: Option[OffsetDateTime],
      windowRangeEnd: Option[OffsetDateTime])(implicit ec: ExecutionContext): Future[Seq[AggregationResultEntity]]

  def getAggregationResultInfo(
      projectId: ProjectId,
      aggregationRuleId: AggregationRuleId,
      groupByFieldValue: String,
      windowRangeStart: Option[OffsetDateTime],
      windowRangeEnd: Option[OffsetDateTime])(implicit ec: ExecutionContext): Future[Option[IdAndCreatedAtPair]]

  def createAggregationResults(
      newAggregationResults: Seq[AggregationResultFromEvent],
      aggregationResultsToUpdate: Seq[AggregationResultEntity])(implicit ec: ExecutionContext): Future[Unit]
}

object AggregationResultRepository {
  type IdAndCreatedAtPair = (AggregationResultId, OffsetDateTime)
}
