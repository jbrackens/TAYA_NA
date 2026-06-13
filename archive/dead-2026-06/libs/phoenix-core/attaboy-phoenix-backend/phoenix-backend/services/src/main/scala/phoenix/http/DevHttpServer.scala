package phoenix.http

import akka.actor.typed.ActorSystem
import org.slf4j.LoggerFactory

import phoenix.core.Clock
import phoenix.http.core.HttpServer
import phoenix.http.core.SwaggerDefinition
import phoenix.http.routes.dev.DevRoutes
import phoenix.http.routes.dev.DevRoutesConfiguration
import phoenix.markets.MarketsBoundedContext
import phoenix.punters.PuntersBoundedContext
import phoenix.punters.PuntersDomainConfig
import phoenix.punters.domain.AuthenticationRepository
import phoenix.punters.domain.PuntersRepository
import phoenix.punters.domain.TermsAndConditionsRepository
import phoenix.softplay.domain.SoftPlayRepository
import phoenix.wallets.WalletsBoundedContext

final class DevHttpServer(routes: DevRoutes, port: Int, system: ActorSystem[_]) {
  def start(): Unit = HttpServer.start(classOf[DevHttpServer].getSimpleName, routes.toAkkaHttp, port, system)
}

object DevHttpServer {
  private val log = LoggerFactory.getLogger(getClass)

  def create(
      port: Int,
      markets: MarketsBoundedContext,
      punters: PuntersBoundedContext,
      wallets: WalletsBoundedContext,
      authenticationRepository: AuthenticationRepository,
      puntersRepository: PuntersRepository,
      termsAndConditionsRepository: TermsAndConditionsRepository,
      softPlayRepository: SoftPlayRepository,
      devRoutesConfiguration: DevRoutesConfiguration,
      publicRoutesSwagger: SwaggerDefinition,
      puntersDomainConfig: PuntersDomainConfig)(implicit system: ActorSystem[_], clock: Clock): DevHttpServer = {

    log.info("Development HTTP routes starting...")

    val routes =
      DevRoutes.create(
        markets,
        punters,
        wallets,
        authenticationRepository,
        puntersRepository,
        termsAndConditionsRepository,
        softPlayRepository,
        devRoutesConfiguration,
        publicRoutesSwagger,
        puntersDomainConfig)
    new DevHttpServer(routes, port, system)
  }
}
