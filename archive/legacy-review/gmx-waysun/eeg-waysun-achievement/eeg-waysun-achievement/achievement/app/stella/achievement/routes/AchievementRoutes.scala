package stella.achievement.routes

import java.nio.charset.StandardCharsets

import scala.concurrent.ExecutionContext

import com.google.common.hash.Hashing
import play.api.cache.redis.CacheAsyncApi
import play.api.routing.Router.Routes
import sttp.tapir.server.play.PlayServerInterpreter

import stella.common.http.Response
import stella.common.http.jwt.JwtAuthorization
import stella.common.http.jwt.StellaAuthContext
import stella.common.http.routes.RoutesResponseHelper
import stella.common.models.Ids.ProjectId

import stella.achievement.config.CacheConfig
import stella.achievement.models.BaseFetchAchievementEventsParams
import stella.achievement.services.AchievementBoundedContext

/** Combines endpoints definitions with their actual logic */
class AchievementRoutes(
    boundedContext: AchievementBoundedContext,
    cache: CacheAsyncApi,
    cacheConfig: CacheConfig,
    serverInterpreter: PlayServerInterpreter)(implicit auth: JwtAuthorization[StellaAuthContext], ec: ExecutionContext)
    extends RoutesResponseHelper {

  lazy val achievementDataRoutes: Routes = getAggregationWindows.orElse(getAchievementEvents)

  lazy val getAggregationWindows: Routes = {
    val endpoint = AchievementEndpoints.getAggregationWindowsEndpoint.serverLogic { authContext => achievementRuleId =>
      val projectId = getProjectId(authContext)
      val key = getCacheKeyHash(s"getAchievementAggregationWindows::$projectId::$achievementRuleId")
      cache
        .getOrFuture(key, cacheConfig.windowsTimeout)(
          boundedContext
            .getAggregationWindows(projectId, achievementRuleId)
            .map(windows => Right(Response.asSuccess(windows))))
        .transform(handleUnexpectedFutureError(s"""Couldn't fetch aggregation windows for:
                                                    | projectId = $projectId
                                                    | achievementRuleId = $achievementRuleId"""))
    }
    serverInterpreter.toRoutes(endpoint)
  }

  lazy val getAchievementEvents: Routes = {
    val endpoint = AchievementEndpoints.getAchievementEventsEndpoint.serverLogic { authContext =>
      { case (achievementRuleId, groupByFieldValue, windowRangeStart, orderBy, pageSize, pageNumber, countPages) =>
        val projectId = getProjectId(authContext)
        val key = getCacheKeyHash(
          s"getAchievementEvents::$projectId::$achievementRuleId::$groupByFieldValue::$windowRangeStart::$orderBy::$pageSize::$pageNumber::$countPages")
        cache
          .getOrFuture(key, cacheConfig.achievementEventsTimeout)(
            boundedContext
              .getAchievementEventsPage(
                BaseFetchAchievementEventsParams(
                  projectId,
                  achievementRuleId,
                  groupByFieldValue,
                  windowRangeStart,
                  orderBy),
                pageSize,
                pageNumber,
                countPages)
              .map(page => Right(Response.asSuccess(page))))
          .transform(handleUnexpectedFutureError(s"""Couldn't fetch achievement events for:
                                                    | projectId = $projectId
                                                    | achievementRuleId = $achievementRuleId
                                                    | fieldValue = $groupByFieldValue
                                                    | windowRangeStart = $windowRangeStart
                                                    | orderBy = $orderBy
                                                    | pageSize = $pageSize
                                                    | pageNo = $pageNumber""".stripMargin))
      }
    }
    serverInterpreter.toRoutes(endpoint)
  }

  private def getProjectId(authContext: StellaAuthContext): ProjectId = ProjectId(authContext.primaryProjectId)

  private def getCacheKeyHash(key: String): String =
    Hashing.sha256().hashString(key, StandardCharsets.UTF_8).toString
}
