package phoenix.http.routes.dev

import akka.actor.typed.ActorSystem
import akka.http.scaladsl.server.Directives._
import akka.http.scaladsl.server.Route

import phoenix.core.Clock
import phoenix.http.core.HttpLogging.withLogging
import phoenix.http.core.SwaggerDefinition
import phoenix.markets.MarketsBoundedContext
import phoenix.punters.PuntersBoundedContext
import phoenix.punters.PuntersDomainConfig
import phoenix.punters.domain.AuthenticationRepository
import phoenix.punters.domain.PuntersRepository
import phoenix.punters.domain.TermsAndConditionsRepository
import phoenix.punters.infrastructure.http.DevPunterRoutes
import phoenix.softplay.domain.SoftPlayRepository
import phoenix.softplay.infrastructure.http.DevSoftPlayRoutes
import phoenix.wallets.WalletsBoundedContext

final class DevRoutes(
    devMarketRoutes: DevMarketRoutes,
    devPunterRoutes: DevPunterRoutes,
    devSoftPlayRoutes: DevSoftPlayRoutes,
    openApiRoutes: DevOpenApiRoutes,
    swaggerDefinition: SwaggerDefinition) {

  lazy val toAkkaHttp: Route =
    withLogging {
      concat(devMarketRoutes.toAkkaHttp, devPunterRoutes.toAkkaHttp, devSoftPlayRoutes.toAkkaHttp, openApi)
    }

  private lazy val openApi = {
    pathPrefix("docs") {
      pathEndOrSingleSlash {
        openApiRoutes.redirectToSwaggerUiIndex("docs.yaml")
      } ~ path("docs.yaml") {
        openApiRoutes.getOpenApiYaml(swaggerDefinition.endpoints)
      } ~ {
        openApiRoutes.getSwaggerUiResource
      }
    }
  }

}

object DevRoutes {
  def create(
      markets: MarketsBoundedContext,
      punters: PuntersBoundedContext,
      wallets: WalletsBoundedContext,
      authenticationRepository: AuthenticationRepository,
      puntersRepository: PuntersRepository,
      termsAndConditionsRepository: TermsAndConditionsRepository,
      softPlayRepository: SoftPlayRepository,
      devRoutesConfiguration: DevRoutesConfiguration,
      publicRoutesSwagger: SwaggerDefinition,
      puntersDomainConfig: PuntersDomainConfig)(implicit system: ActorSystem[_], clock: Clock): DevRoutes = {
    // TODO (PHXD-612): extract a separate yaml file for dev swagger definitions
    new DevRoutes(
      new DevMarketRoutes(markets),
      new DevPunterRoutes(
        punters,
        wallets,
        authenticationRepository,
        puntersRepository,
        termsAndConditionsRepository,
        devRoutesConfiguration,
        clock,
        puntersDomainConfig)(system.executionContext),
      new DevSoftPlayRoutes(softPlayRepository, devRoutesConfiguration, clock)(system.executionContext),
      new DevOpenApiRoutes,
      publicRoutesSwagger)
  }
}
