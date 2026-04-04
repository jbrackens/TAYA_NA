package stella.leaderboard.server

import scala.concurrent.ExecutionContext

import akka.stream.Materializer
import com.softwaremill.macwire.wire
import com.softwaremill.macwire.wireWith
import com.typesafe.config.ConfigFactory
import play.api.cache.redis.CacheAsyncApi
import slick.basic.DatabaseConfig
import slick.jdbc.JdbcProfile
import sttp.tapir.server.play.PlayServerInterpreter
import sttp.tapir.server.play.PlayServerOptions

import stella.common.core.Clock
import stella.common.core.JavaOffsetDateTimeClock
import stella.common.http.config.OpenApiConfig
import stella.common.http.jwt._

import stella.leaderboard.db.AggregationResultRepository
import stella.leaderboard.db.SlickAggregationResultRepository
import stella.leaderboard.server.config.CacheConfig
import stella.leaderboard.server.config.LeaderboardConfig
import stella.leaderboard.server.routes.ApiRouter
import stella.leaderboard.server.routes.LeaderboardRoutes
import stella.leaderboard.server.routes.OpenApiRoutes
import stella.leaderboard.server.routes.StellaPlayServerOptions
import stella.leaderboard.services.LeaderboardBoundedContext
import stella.leaderboard.services.LeaderboardBoundedContextImpl

trait LeaderboardModule {
  implicit def materializer: Materializer
  implicit def executionContext: ExecutionContext
  def cache: CacheAsyncApi

  lazy val config: LeaderboardConfig = LeaderboardConfig.loadConfig()
  lazy val dbConfig: DatabaseConfig[JdbcProfile] = DatabaseConfig.forConfig("slick.dbs.default", ConfigFactory.load())

  implicit lazy val clock: Clock = JavaOffsetDateTimeClock

  lazy val aggregationResultRepository: AggregationResultRepository = wire[SlickAggregationResultRepository]
  lazy val leaderboardBoundedContext: LeaderboardBoundedContext = wire[LeaderboardBoundedContextImpl]

  implicit lazy val jwtAuthorization: JwtAuthorization[StellaAuthContext] = wireWith(createJwtAuthorizationInstance _)
  lazy val openApiConfig: OpenApiConfig = config.openApi

  lazy val cacheConfig: CacheConfig = config.cache
  lazy val serverOptions: PlayServerOptions = wireWith(StellaPlayServerOptions.instance _)
  lazy val serverInterpreter: PlayServerInterpreter = PlayServerInterpreter.apply(serverOptions)(materializer)

  lazy val leaderboardRoutes: LeaderboardRoutes = wire[LeaderboardRoutes]
  lazy val openApiRoutes: OpenApiRoutes = wire[OpenApiRoutes]

  lazy val apiRouter: ApiRouter = wire[ApiRouter]

  private def createJwtAuthorizationInstance(config: LeaderboardConfig): JwtAuthorization[StellaAuthContext] = {
    val jwtConfig = config.jwt
    if (jwtConfig.requireJwtAuth) {
      val oidcPropertiesProvider = new OidcDiscovery(jwtConfig)
      val authContextExtractor = new SecretBoxAuthContextExtractor(config.secretBoxHexKey)
      new JwksBasedJwtAuthorization[StellaAuthContext](jwtConfig, oidcPropertiesProvider, authContextExtractor)
    } else new DisabledJwtAuthorization(dummyUserId = config.testUserId, dummyProjectId = config.testProjectId)
  }
}
