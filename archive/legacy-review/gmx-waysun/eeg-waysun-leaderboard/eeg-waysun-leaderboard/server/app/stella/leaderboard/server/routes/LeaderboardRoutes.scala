package stella.leaderboard.server.routes

import java.nio.charset.StandardCharsets

import scala.concurrent.ExecutionContext
import scala.util.Failure
import scala.util.Success
import scala.util.Try

import com.google.common.hash.Hashing
import org.slf4j.Logger
import org.slf4j.LoggerFactory
import play.api.cache.redis.CacheAsyncApi
import play.api.routing.Router.Routes
import sttp.model.StatusCode
import sttp.tapir.server.play.PlayServerInterpreter

import stella.common.http.Response
import stella.common.http.error.ErrorOutput
import stella.common.http.error.PresentationErrorCode
import stella.common.http.jwt.JwtAuthorization
import stella.common.http.jwt.StellaAuthContext
import stella.common.http.routes.TapirAuthDirectives.ErrorOut
import stella.common.models.Ids.ProjectId

import stella.leaderboard.models.BaseFetchAggregationResultsParams
import stella.leaderboard.server.config.CacheConfig
import stella.leaderboard.services.LeaderboardBoundedContext

/** Combines endpoints definitions with their actual logic */
class LeaderboardRoutes(
    boundedContext: LeaderboardBoundedContext,
    cache: CacheAsyncApi,
    cacheConfig: CacheConfig,
    serverInterpreter: PlayServerInterpreter)(implicit
    auth: JwtAuthorization[StellaAuthContext],
    ec: ExecutionContext) {
  import LeaderboardRoutes._

  lazy val leaderboardDataRoutes: Routes =
    getAggregationWindows
      .orElse(getAggregationResults)
      .orElse(getAggregationResultNeighbors)
      .orElse(compareAggregationResults)

  lazy val getAggregationWindows: Routes = {
    val endpoint = LeaderboardEndpoints.getAggregationWindowsEndpoint.serverLogic { authContext => aggregationRuleId =>
      val projectId = getProjectId(authContext)
      val key = getCacheKeyHash(s"getAggregationWindows::$projectId::$aggregationRuleId")
      cache
        .getOrFuture(key, cacheConfig.windowsTimeout)(
          boundedContext
            .getAggregationWindows(projectId, aggregationRuleId)
            .map(windows => Right(Response.asSuccess(windows))))
        .transform(handleUnexpectedFutureError(s"""Couldn't fetch aggregation windows for:
                                                    | projectId = $projectId
                                                    | aggregationRuleId = $aggregationRuleId"""))
    }
    serverInterpreter.toRoutes(endpoint)
  }

  lazy val getAggregationResults: Routes = {
    val endpoint = LeaderboardEndpoints.getAggregationResultsEndpoint.serverLogic { authContext =>
      { case (aggregationRuleId, windowRangeStart, orderBy, positionType, pageSize, pageNo, countPages) =>
        val projectId = getProjectId(authContext)
        val key = getCacheKeyHash(
          s"getAggregationResults::$projectId::$aggregationRuleId::$windowRangeStart::$orderBy::$positionType::$pageSize::$pageNo::$countPages")
        cache
          .getOrFuture(key, cacheConfig.aggregationResultsTimeout)(boundedContext
            .getAggregationResultsPage(
              BaseFetchAggregationResultsParams(projectId, aggregationRuleId, windowRangeStart, orderBy, positionType),
              pageSize,
              pageNo,
              countPages)
            .map(page => Right(Response.asSuccess(page))))
          .transform(handleUnexpectedFutureError(s"""Couldn't fetch aggregation results for:
               | projectId = $projectId
               | aggregationRuleId = $aggregationRuleId
               | windowRangeStart = $windowRangeStart
               | orderBy = $orderBy
               | positionType = $positionType
               | pageSize = $pageSize
               | pageNo = $pageNo""".stripMargin))
      }
    }
    serverInterpreter.toRoutes(endpoint)
  }

  lazy val getAggregationResultNeighbors: Routes = {
    val endpoint = LeaderboardEndpoints.getAggregationResultNeighborsEndpoint.serverLogic { authContext =>
      { case (aggregationRuleId, size, windowRangeStart, orderBy, positionType, fieldValue) =>
        val projectId = getProjectId(authContext)
        val key = getCacheKeyHash(
          s"getAggregationResultNeighbors::$projectId::$aggregationRuleId::$size::$windowRangeStart::$orderBy::$positionType::$fieldValue")
        cache
          .getOrFuture(key, cacheConfig.neighborsTimeout)(boundedContext
            .getAggregationResultNeighbors(
              BaseFetchAggregationResultsParams(projectId, aggregationRuleId, windowRangeStart, orderBy, positionType),
              size,
              fieldValue)
            .map(aggregationResults => Right(Response.asSuccess(aggregationResults))))
          .transform(handleUnexpectedFutureError(s"""Couldn't fetch aggregation results neighbors for:
                                                    | projectId = $projectId
                                                    | aggregationRuleId = $aggregationRuleId
                                                    | size = $size
                                                    | windowRangeStart = $windowRangeStart
                                                    | orderBy = $orderBy
                                                    | positionType = $positionType
                                                    | fieldValue = $fieldValue""".stripMargin))
      }
    }
    serverInterpreter.toRoutes(endpoint)
  }

  lazy val compareAggregationResults: Routes = {
    val endpoint = LeaderboardEndpoints.compareAggregationResultsEndpoint.serverLogic { authContext =>
      { case (aggregationRuleId, windowRangeStart, orderBy, positionType, fieldValues) =>
        val projectId = getProjectId(authContext)
        val uniqueSortedFieldValues = fieldValues.distinct.sorted
        val key = getCacheKeyHash(
          s"compareAggregationResults::$projectId::$aggregationRuleId::$windowRangeStart::$orderBy::$positionType::$uniqueSortedFieldValues")
        cache
          .getOrFuture(key, cacheConfig.compareResultsTimeout)(boundedContext
            .getAggregationResultsForValues(
              BaseFetchAggregationResultsParams(projectId, aggregationRuleId, windowRangeStart, orderBy, positionType),
              uniqueSortedFieldValues)
            .map(aggregationResults => Right(Response.asSuccess(aggregationResults))))
          .transform(handleUnexpectedFutureError(s"""Couldn't compare aggregation results for:
                                                    | projectId = $projectId
                                                    | aggregationRuleId = $aggregationRuleId
                                                    | windowRangeStart = $windowRangeStart
                                                    | orderBy = $orderBy
                                                    | positionType = $positionType
                                                    | fieldValues = $fieldValues""".stripMargin))
      }
    }
    serverInterpreter.toRoutes(endpoint)
  }

  private def handleUnexpectedFutureError[T](errorMessage: String)(
      futureResult: Try[Either[ErrorOut, T]]): Try[Either[ErrorOut, T]] =
    futureResult match {
      case _ @Success(_) => futureResult
      case Failure(e)    => Success(Left(handleUnexpectedError(errorMessage, e)))
    }

  private def handleUnexpectedError(errorMessage: String, underlyingError: Throwable): ErrorOut = {
    log.error(errorMessage, underlyingError)
    val response = errorCodeResponse(PresentationErrorCode.InternalError)
    StatusCode.InternalServerError -> response
  }

  private def errorCodeResponse(code: PresentationErrorCode): Response[ErrorOutput] =
    Response.asFailure(ErrorOutput.one(code))

  private def getCacheKeyHash(key: String): String =
    Hashing.sha256().hashString(key, StandardCharsets.UTF_8).toString

  private def getProjectId(authContext: StellaAuthContext): ProjectId = ProjectId(authContext.primaryProjectId)
}

object LeaderboardRoutes {
  private val log: Logger = LoggerFactory.getLogger(getClass)
}
