package stella.leaderboard.services

import scala.concurrent.ExecutionContext
import scala.concurrent.Future

import stella.common.http.PaginatedResult
import stella.common.http.jwt.Permission
import stella.common.models.Ids._

import stella.leaderboard.models.AggregationResult
import stella.leaderboard.models.AggregationResultFromEvent
import stella.leaderboard.models.AggregationWindow
import stella.leaderboard.models.BaseFetchAggregationResultsParams
import stella.leaderboard.models.Ids._

trait LeaderboardBoundedContext {

  def getAggregationWindows(projectId: ProjectId, aggregationRuleId: AggregationRuleId)(implicit
      ec: ExecutionContext): Future[Seq[AggregationWindow]]

  def getAggregationResultsPage(
      baseParams: BaseFetchAggregationResultsParams,
      pageSize: Int,
      pageNumber: Int,
      shouldCountPages: Boolean)(implicit ec: ExecutionContext): Future[PaginatedResult[AggregationResult]]

  def getAggregationResultNeighbors(
      baseParams: BaseFetchAggregationResultsParams,
      neighborsSize: Int,
      fieldValue: String)(implicit ec: ExecutionContext): Future[Seq[AggregationResult]]

  def getAggregationResultsForValues(baseParams: BaseFetchAggregationResultsParams, fieldValues: Seq[String])(implicit
      ec: ExecutionContext): Future[Seq[AggregationResult]]

  def storeAggregationResults(aggregationResults: Seq[AggregationResultFromEvent])(implicit
      ec: ExecutionContext): Future[Int]
}
object LeaderboardBoundedContext {

  object AggregationWindowsReadPermission extends Permission {
    override val value: String = "leaderboard:aggregation:window:read"
  }

  object AggregationResultsReadPermission extends Permission {
    override val value: String = "leaderboard:aggregation:read"
  }

  object AggregationResultNeighborsReadPermission extends Permission {
    override val value: String = "leaderboard:aggregation:neighbor:read"
  }

  object AggregationResultComparisonReadPermission extends Permission {
    override val value: String = "leaderboard:aggregation:compare:read"
  }
}
