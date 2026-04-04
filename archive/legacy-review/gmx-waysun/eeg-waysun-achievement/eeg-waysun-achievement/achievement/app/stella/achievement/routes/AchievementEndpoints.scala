package stella.achievement.routes

import java.time.OffsetDateTime

import scala.concurrent.ExecutionContext
import scala.concurrent.Future

import sttp.model.StatusCode
import sttp.tapir._
import sttp.tapir.generic.auto._
import sttp.tapir.json.spray.jsonBody
import sttp.tapir.server.PartialServerEndpoint

import stella.common.http.AggregationWindow
import stella.common.http.PaginatedResult
import stella.common.http.Response
import stella.common.http.error.ErrorOutput
import stella.common.http.jwt.JwtAuthorization
import stella.common.http.jwt.StellaAuthContext
import stella.common.http.routes.SwaggerDefinition
import stella.common.http.routes.TapirAuthDirectives.endpointWithJwtValidation

import stella.achievement.models.AchievementEvent
import stella.achievement.models.Ids.AchievementConfigurationRulePublicId
import stella.achievement.models.Ids.AchievementConfigurationRulePublicId.achievementConfigurationRulePublicIdCodec
import stella.achievement.models.OrderByFilters
import stella.achievement.services.AchievementBoundedContext.AchievementEventsReadPermission
import stella.achievement.services.AchievementBoundedContext.AggregationWindowsReadPermission

object AchievementEndpoints {
  import ResponseFormats._
  import errorOutputFormats._
  import errorOutputSchemas._

  private val basePath = "achievements"
  private val windowsPathSegment = "windows"
  private val achievementRuleIdPathParam = "achievement_rule_id"
  private val defaultCountPages = false
  private val defaultPageNumber = 1
  private val maxPageSize = 1000
  private val minPageNumber = 1
  private val defaultPageSize = 20
  private val minPageSize = 1

  private object QueryParams {
    val countPages = "count_pages"
    val fieldValue = "field_value"
    val orderBy = "order_by"
    val page = "page"
    val pageSize = "page_size"
    val windowRangeStart = "window_range_start"
  }

  def getAggregationWindowsEndpoint(implicit
      auth: JwtAuthorization[StellaAuthContext],
      ec: ExecutionContext): PartialServerEndpoint[
    String,
    StellaAuthContext,
    AchievementConfigurationRulePublicId,
    (StatusCode, Response[ErrorOutput]),
    Response[Seq[AggregationWindow]],
    Any,
    Future] =
    endpointWithJwtValidation(AggregationWindowsReadPermission).get
      .in(basePath / path[AchievementConfigurationRulePublicId](achievementRuleIdPathParam) / windowsPathSegment)
      .out(statusCode(StatusCode.Ok))
      .out(jsonBody[Response[Seq[AggregationWindow]]])
      .name("getAggregationWindows")
      .description(
        s"""Returns all aggregation windows for a given achievement rule id which have the achievement events.
                      |
                      |Required permission: `${AggregationWindowsReadPermission.value}`
                      |""".stripMargin)

  def getAchievementEventsEndpoint(implicit
      auth: JwtAuthorization[StellaAuthContext],
      ec: ExecutionContext): PartialServerEndpoint[
    String,
    StellaAuthContext,
    (AchievementConfigurationRulePublicId, Option[String], Option[OffsetDateTime], OrderByFilters, Int, Int, Boolean),
    (StatusCode, Response[ErrorOutput]),
    Response[PaginatedResult[AchievementEvent]],
    Any,
    Future] =
    endpointWithJwtValidation(AchievementEventsReadPermission).get
      .in(basePath / path[AchievementConfigurationRulePublicId](achievementRuleIdPathParam))
      .in(query[Option[String]](QueryParams.fieldValue)
        .default(None)
        .description("Results will be limited to this field value"))
      .in(query[Option[OffsetDateTime]](QueryParams.windowRangeStart).default(None))
      .in(query[OrderByFilters](QueryParams.orderBy).description(OrderByFilters.description))
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
      .out(jsonBody[Response[PaginatedResult[AchievementEvent]]])
      .name("getAchievementEvents")
      .description(s"""Returns all achievement events results for a given achievement rule id in a given range taking pagination into account.
           |
           |Required permission: `${AchievementEventsReadPermission.value}`
           |""".stripMargin)

  def swaggerDefinition(implicit auth: JwtAuthorization[StellaAuthContext], ec: ExecutionContext): SwaggerDefinition =
    SwaggerDefinition(getAggregationWindowsEndpoint, getAchievementEventsEndpoint)
}
