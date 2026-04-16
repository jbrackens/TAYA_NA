package phoenix.websockets

import scala.concurrent.ExecutionContext

import akka.actor.typed.ActorSystem
import slick.basic.DatabaseConfig
import slick.jdbc.JdbcProfile

import phoenix.bets.infrastructure.akka.AkkaBetEventStreams
import phoenix.bets.infrastructure.akka.BetEventsWebsocketSingleton
import phoenix.core.ScalaObjectUtils._
import phoenix.http.core.HttpServer
import phoenix.jwt.JwtConfig
import phoenix.keycloak.KeycloakConfig
import phoenix.keycloak.KeycloakTokenVerifier
import phoenix.markets.MarketsBoundedContext
import phoenix.markets.fixtures.infrastructure.akka.AkkaFixtureEventStreams
import phoenix.markets.fixtures.infrastructure.akka.FixtureEventsWebsocketSingleton
import phoenix.markets.infrastructure.akka.AkkaMarketEventStreams
import phoenix.markets.infrastructure.akka.MarketEventsWebsocketSingleton
import phoenix.utils.UUIDGenerator
import phoenix.wallets.WalletsBoundedContext
import phoenix.wallets.infrastructure.akka.AkkaWalletEventStreams
import phoenix.wallets.infrastructure.akka.WalletEventsWebsocketMessageSingleton
import phoenix.websockets.WebSocketRoutes._
import phoenix.websockets.domain.WebsocketMessageOffsetRepository
import phoenix.websockets.infrastructure.SlickPersistenceQueryOffsetRepository

object WebSocketServer {

  def start(
      port: Int,
      jwtConfig: JwtConfig,
      keycloakConfig: KeycloakConfig,
      uuidGenerator: UUIDGenerator,
      dbConfig: DatabaseConfig[JdbcProfile],
      markets: MarketsBoundedContext,
      wallets: WalletsBoundedContext)(implicit system: ActorSystem[_], ec: ExecutionContext): Unit = {
    val keycloakTokenVerifier = KeycloakTokenVerifier.build(jwtConfig, keycloakConfig)

    val offsetRepository: WebsocketMessageOffsetRepository = new SlickPersistenceQueryOffsetRepository(dbConfig)

    val marketEventStreams = new AkkaMarketEventStreams(MarketEventsWebsocketSingleton(markets, offsetRepository))
    val fixtureEventStreams = new AkkaFixtureEventStreams(FixtureEventsWebsocketSingleton(offsetRepository))
    val betEventStreams = new AkkaBetEventStreams(BetEventsWebsocketSingleton(offsetRepository))
    val walletEventStreams = new AkkaWalletEventStreams(
      WalletEventsWebsocketMessageSingleton(wallets, offsetRepository))

    HttpServer.start(
      WebSocketServer.simpleObjectName,
      webSocketRoute(
        keycloakTokenVerifier,
        uuidGenerator,
        marketEventStreams,
        fixtureEventStreams,
        betEventStreams,
        walletEventStreams),
      port,
      system)
  }
}
