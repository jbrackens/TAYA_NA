package stella.rules.routes

import scala.concurrent.ExecutionContext
import scala.concurrent.Future

import play.api.routing.Router.Routes
import sttp.tapir.openapi.Server
import sttp.tapir.server.play.PlayServerInterpreter
import sttp.tapir.swagger.SwaggerUIOptions
import sttp.tapir.swagger.bundle.SwaggerInterpreter

import stella.common.core.Clock
import stella.common.http.config.OpenApiConfig
import stella.common.http.jwt.JwtAuthorization
import stella.common.http.jwt.StellaAuthContext

import stella.rules.routes.achievement.AchievementRuleConfigurationEndpoints
import stella.rules.routes.aggregation.AggregationRuleConfigurationEndpoints
import stella.rules.routes.event.EventConfigurationEndpoints

class OpenApiRoutes(serverInterpreter: PlayServerInterpreter, openApiConfig: OpenApiConfig)(implicit
    jwtAuthorization: JwtAuthorization[StellaAuthContext],
    ec: ExecutionContext,
    clock: Clock) {

  lazy val openApi: Routes =
    serverInterpreter.toRoutes(
      SwaggerInterpreter(
        customiseDocsModel = _.servers(List(Server(openApiConfig.serverUrl))),
        swaggerUIOptions = SwaggerUIOptions.default.pathPrefix(List(OpenApiRoutes.openApiDocsPath)))
        .fromEndpoints[Future](
          endpoints =
            (EventConfigurationEndpoints.swaggerDefinition ++ AggregationRuleConfigurationEndpoints.swaggerDefinition ++ AchievementRuleConfigurationEndpoints.swaggerDefinition).endpoints,
          title = "Stella Rule Configurator",
          version = "0.9"))
}

object OpenApiRoutes {
  private val openApiDocsPath = "rule_configurator_docs"
}
