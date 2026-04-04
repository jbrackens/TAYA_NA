package stella.achievement

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

import stella.achievement.config.AchievementConfig
import stella.achievement.config.CacheConfig
import stella.achievement.db.AchievementEventRepository
import stella.achievement.db.SlickAchievementEventRepository
import stella.achievement.routes.AchievementRoutes
import stella.achievement.routes.ApiRouter
import stella.achievement.routes.OpenApiRoutes
import stella.achievement.routes.StellaPlayServerOptions
import stella.achievement.services.AchievementBoundedContext
import stella.achievement.services.AchievementBoundedContextImpl

trait AchievementModule {
  implicit def materializer: Materializer
  implicit def executionContext: ExecutionContext
  def cache: CacheAsyncApi

  lazy val config: AchievementConfig = AchievementConfig.loadConfig()
  lazy val dbConfig: DatabaseConfig[JdbcProfile] = DatabaseConfig.forConfig("slick.dbs.default", ConfigFactory.load())

  implicit lazy val clock: Clock = JavaOffsetDateTimeClock

  lazy val achievementEventRepository: AchievementEventRepository = wire[SlickAchievementEventRepository]
  lazy val achievementBoundedContext: AchievementBoundedContext = wire[AchievementBoundedContextImpl]

  implicit lazy val jwtAuthorization: JwtAuthorization[StellaAuthContext] = wireWith(createJwtAuthorizationInstance _)
  lazy val openApiConfig: OpenApiConfig = config.openApi

  lazy val cacheConfig: CacheConfig = config.cache
  lazy val serverOptions: PlayServerOptions = wireWith(StellaPlayServerOptions.instance _)
  lazy val serverInterpreter: PlayServerInterpreter = PlayServerInterpreter.apply(serverOptions)(materializer)

  lazy val achievementRoutes: AchievementRoutes = wire[AchievementRoutes]
  lazy val openApiRoutes: OpenApiRoutes = wire[OpenApiRoutes]

  lazy val apiRouter: ApiRouter = wire[ApiRouter]

  private def createJwtAuthorizationInstance(config: AchievementConfig): JwtAuthorization[StellaAuthContext] = {
    val jwtConfig = config.jwt
    if (jwtConfig.requireJwtAuth) {
      val oidcPropertiesProvider = new OidcDiscovery(jwtConfig)
      val authContextExtractor = new SecretBoxAuthContextExtractor(config.secretBoxHexKey)
      new JwksBasedJwtAuthorization[StellaAuthContext](jwtConfig, oidcPropertiesProvider, authContextExtractor)
    } else new DisabledJwtAuthorization(dummyUserId = config.testUserId, dummyProjectId = config.testProjectId)
  }
}
