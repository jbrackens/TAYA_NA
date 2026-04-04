package stella.leaderboard.server.routes

import java.time.OffsetDateTime

import scala.concurrent.ExecutionContext
import scala.concurrent.Future

import sttp.model.StatusCode
import sttp.tapir._
import sttp.tapir.generic.auto._
import sttp.tapir.json.spray.jsonBody
import sttp.tapir.server.PartialServerEndpoint

import stella.common.http.PaginatedResult
import stella.common.http.Response
import stella.common.http.error.ErrorOutput
import stella.common.http.jwt.JwtAuthorization
import stella.common.http.jwt.StellaAuthContext
import stella.common.http.routes.SwaggerDefinition
import stella.common.http.routes.TapirAuthDirectives.endpointWithJwtValidation

import stella.leaderboard.models.AggregationResult
import stella.leaderboard.models.AggregationWindow
import stella.leaderboard.models.Ids.AggregationRuleId
import stella.leaderboard.models.Ids.AggregationRuleId.aggregationRuleIdCodec
import stella.leaderboard.models.OrderByFilters
import stella.leaderboard.models.PositionType
import stella.leaderboard.models.PositionType.DenseRank
import stella.leaderboard.services.LeaderboardBoundedContext.AggregationResultComparisonReadPermission
import stella.leaderboard.services.LeaderboardBoundedContext.AggregationResultNeighborsReadPermission
import stella.leaderboard.services.LeaderboardBoundedContext.AggregationResultsReadPermission
import stella.leaderboard.services.LeaderboardBoundedContext.AggregationWindowsReadPermission

object LeaderboardEndpoints {
  import ResponseFormats._
  import errorOutputFormats._
  import errorOutputSchemas._

  private val basePath = "leaderboard" / "aggregations"
  private val windowsPathSegment = "windows"
  private val neighborsPathSegment = "neighbors"
  private val comparePathSegment = "compare"
  private val aggregationRuleIdPathParam = "rule_id"
  private val defaultCountPages = false
  private val defaultNeighborsSize = 3
  private val minNeighborsSize = 1
  private val maxNeighborsSize = 500
  private val defaultPageNumber = 1
  private val maxPageSize = 1000
  private val minPageNumber = 1
  private val defaultPageSize = 20
  private val minPageSize = 1
  private val comparisonFieldValuesMinSize = 1
  private val defaultPositionType = DenseRank

  private object QueryParams {
    val countPages = "count_pages"
    val fieldValue = "field_value"
    val orderBy = "order_by"
    val page = "page"
    val pageSize = "page_size"
    val neighborsSize = "size"
    val windowRangeStart = "window_range_start"
    val fieldValues = "field_values"
    val positionType = "position_type"
  }

  def getAggregationWindowsEndpoint(implicit
      auth: JwtAuthorization[StellaAuthContext],
      ec: ExecutionContext): PartialServerEndpoint[
    String,
    StellaAuthContext,
    AggregationRuleId,
    (StatusCode, Response[ErrorOutput]),
    Response[Seq[AggregationWindow]],
    Any,
    Future] =
    endpointWithJwtValidation(AggregationWindowsReadPermission).get
      .in(basePath / path[AggregationRuleId](aggregationRuleIdPathParam) / windowsPathSegment)
      .out(statusCode(StatusCode.Ok))
      .out(jsonBody[Response[Seq[AggregationWindow]]])
      .name("getAggregationWindows")
      .description(s"""Returns all aggregation windows for a given rule id which have the aggregation results.
           |
           |Required permission: `${AggregationWindowsReadPermission.value}`
           |""".stripMargin)

  def getAggregationResultsEndpoint(implicit
      auth: JwtAuthorization[StellaAuthContext],
      ec: ExecutionContext): PartialServerEndpoint[
    String,
    StellaAuthContext,
    (AggregationRuleId, Option[OffsetDateTime], OrderByFilters, PositionType, Int, Int, Boolean),
    (StatusCode, Response[ErrorOutput]),
    Response[PaginatedResult[AggregationResult]],
    Any,
    Future] =
    endpointWithJwtValidation(AggregationResultsReadPermission).get
      .in(basePath / path[AggregationRuleId](aggregationRuleIdPathParam))
      .in(query[Option[OffsetDateTime]](QueryParams.windowRangeStart).default(None))
      .in(query[OrderByFilters](QueryParams.orderBy).description(OrderByFilters.description))
      .in(query[PositionType](QueryParams.positionType)
        .default(defaultPositionType)
        .description(PositionType.description))
      .in(query[Int](QueryParams.pageSize)
        .default(defaultPageSize)
        .description(s"Min: $minPageSize, max: $maxPageSize")
        .validate(Validator.all(Validator.min(minPageSize), Validator.max(maxPageSize))))
      .in(query[Int](QueryParams.page)
        .default(defaultPageNumber)
        .description(s"Min: $minPageNumber")
        .validate(Validator.min(minPageNumber)))
      .in(query[Boolean](QueryParams.countPages)
        .default(defaultCountPages)
        .description("Whether the total number of pages should be returned"))
      .out(statusCode(StatusCode.Ok))
      .out(jsonBody[Response[PaginatedResult[AggregationResult]]])
      .name("getAggregationResults")
      .description(
        s"""Returns all aggregation results for a given rule id in a given range taking pagination into account.
           |
           |Required permission: `${AggregationResultsReadPermission.value}`
           |""".stripMargin)

  def getAggregationResultNeighborsEndpoint(implicit
      auth: JwtAuthorization[StellaAuthContext],
      ec: ExecutionContext): PartialServerEndpoint[
    String,
    StellaAuthContext,
    (AggregationRuleId, Int, Option[OffsetDateTime], OrderByFilters, PositionType, String),
    (StatusCode, Response[ErrorOutput]),
    Response[Seq[AggregationResult]],
    Any,
    Future] =
    endpointWithJwtValidation(AggregationResultNeighborsReadPermission).get
      .in(basePath / path[AggregationRuleId](aggregationRuleIdPathParam) / neighborsPathSegment)
      .in(
        query[Int](QueryParams.neighborsSize)
          .default(defaultNeighborsSize)
          .description(s"Min: $minNeighborsSize, max: $maxNeighborsSize")
          .validate(Validator.all(Validator.min(minNeighborsSize), Validator.max(maxNeighborsSize))))
      .in(query[Option[OffsetDateTime]](QueryParams.windowRangeStart).default(None))
      .in(query[OrderByFilters](QueryParams.orderBy).description(OrderByFilters.description))
      .in(query[PositionType](QueryParams.positionType)
        .default(defaultPositionType)
        .description(PositionType.description))
      .in(query[String](QueryParams.fieldValue))
      .out(statusCode(StatusCode.Ok))
      .out(jsonBody[Response[Seq[AggregationResult]]])
      .name("getAggregationResultsNeighbors")
      .description(
        s"""Returns a subset of the aggregation results for a given rule id in a given range around a given field value.
           |
           |Required permission: `${AggregationResultNeighborsReadPermission.value}`
           |""".stripMargin)

  def compareAggregationResultsEndpoint(implicit
      auth: JwtAuthorization[StellaAuthContext],
      ec: ExecutionContext): PartialServerEndpoint[
    String,
    StellaAuthContext,
    (AggregationRuleId, Option[OffsetDateTime], OrderByFilters, PositionType, List[String]),
    (StatusCode, Response[ErrorOutput]),
    Response[Seq[AggregationResult]],
    Any,
    Future] =
    endpointWithJwtValidation(AggregationResultComparisonReadPermission).get
      .in(basePath / path[AggregationRuleId](aggregationRuleIdPathParam) / comparePathSegment)
      .in(query[Option[OffsetDateTime]](QueryParams.windowRangeStart).default(None))
      .in(query[OrderByFilters](QueryParams.orderBy).description(OrderByFilters.description))
      .in(query[PositionType](QueryParams.positionType)
        .default(defaultPositionType)
        .description(PositionType.description))
      .in(query[List[String]](QueryParams.fieldValues)
        .description("Non-empty list of the field values")
        .validate(Validator.minSize(comparisonFieldValuesMinSize)))
      .out(statusCode(StatusCode.Ok))
      .out(jsonBody[Response[Seq[AggregationResult]]])
      .name("compareAggregationResults")
      .description(s"""Returns a sparse list of the aggregation results for a given rule id in a given range for the given field values.
           |
           |Required permission: `${AggregationResultComparisonReadPermission.value}`
           |""".stripMargin)

  def swaggerDefinition(implicit auth: JwtAuthorization[StellaAuthContext], ec: ExecutionContext): SwaggerDefinition =
    SwaggerDefinition(
      getAggregationWindowsEndpoint,
      getAggregationResultsEndpoint,
      getAggregationResultNeighborsEndpoint,
      compareAggregationResultsEndpoint)
}
