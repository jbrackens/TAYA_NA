package stella.usercontext

import scala.concurrent.ExecutionContext

import akka.cluster.sharding.typed.scaladsl.ClusterSharding
import akka.stream.Materializer
import com.softwaremill.macwire.wire
import com.softwaremill.macwire.wireWith
import sttp.tapir.server.play.PlayServerInterpreter
import sttp.tapir.server.play.PlayServerOptions

import stella.common.http.config.OpenApiConfig
import stella.common.http.jwt._

import stella.usercontext.config.UserContextServerConfig
import stella.usercontext.routes.ApiRouter
import stella.usercontext.routes.OpenApiRoutes
import stella.usercontext.routes.UserContextPlayServerOptions
import stella.usercontext.routes.UserContextRoutes
import stella.usercontext.services.ActorUserContextBoundedContext
import stella.usercontext.services.UserContextBoundedContext

trait UserContextModule {
  implicit def materializer: Materializer
  implicit def executionContext: ExecutionContext
  def clusterSharding: ClusterSharding

  lazy val config: UserContextServerConfig = UserContextServerConfig.loadConfig()

  lazy val userContextBoundedContext: UserContextBoundedContext = wire[ActorUserContextBoundedContext]

  implicit lazy val jwtAuthorization: JwtAuthorization[StellaAuthContext] = wireWith(createJwtAuthorizationInstance _)
  lazy val openApiConfig: OpenApiConfig = config.openApi

  lazy val serverOptions: PlayServerOptions = wireWith(UserContextPlayServerOptions.instance _)
  lazy val serverInterpreter: PlayServerInterpreter = PlayServerInterpreter.apply(serverOptions)(materializer)

  lazy val userContextRoutes: UserContextRoutes = wire[UserContextRoutes]
  lazy val openApiRoutes: OpenApiRoutes = wire[OpenApiRoutes]

  lazy val apiRouter: ApiRouter = wire[ApiRouter]

  private def createJwtAuthorizationInstance(config: UserContextServerConfig): JwtAuthorization[StellaAuthContext] = {
    val jwtConfig = config.jwt
    if (jwtConfig.requireJwtAuth) {
      val oidcPropertiesProvider = new OidcDiscovery(jwtConfig)
      val authContextExtractor = new SecretBoxAuthContextExtractor(config.secretBoxHexKey)
      new JwksBasedJwtAuthorization[StellaAuthContext](jwtConfig, oidcPropertiesProvider, authContextExtractor)
    } else new DisabledJwtAuthorization(dummyUserId = config.testUserId, dummyProjectId = config.testProjectId)
  }
}
