package phoenix.websockets

import scala.concurrent.ExecutionContext

import akka.actor.typed.ActorSystem
import akka.http.scaladsl.server.Directives.handleWebSocketMessages
import akka.http.scaladsl.server.Directives.path
import akka.http.scaladsl.server.Route

import phoenix.bets.BetStateUpdate
import phoenix.core.websocket.EventStream
import phoenix.jwt.JwtAuthenticator
import phoenix.markets.MarketsBoundedContext.FixtureStateUpdate
import phoenix.markets.MarketsBoundedContext.MarketId
import phoenix.markets.MarketsBoundedContext.MarketStateUpdate
import phoenix.markets.sports.SportEntity.FixtureId
import phoenix.punters.PunterEntity.PunterId
import phoenix.punters.PuntersBoundedContext.SessionId
import phoenix.utils.UUIDGenerator
import phoenix.wallets.WalletsBoundedContextProtocol.WalletId
import phoenix.wallets.domain.WalletStateUpdate
import phoenix.websockets.WebSocketFlowFactory.buildWebSocketFlow

object WebSocketRoutes {

  def webSocketRoute(
      tokenVerifier: JwtAuthenticator,
      uuidGenerator: UUIDGenerator,
      markets: EventStream[MarketId, MarketStateUpdate],
      fixtures: EventStream[FixtureId, FixtureStateUpdate],
      bets: EventStream[PunterId, BetStateUpdate],
      wallets: EventStream[WalletId, WalletStateUpdate])(implicit
      system: ActorSystem[_],
      ec: ExecutionContext): Route = {
    path("web-socket") {
      val sessionId = SessionId.fromUUID(uuidGenerator.generate())
      handleWebSocketMessages(buildWebSocketFlow(sessionId, markets, fixtures, bets, wallets, tokenVerifier))
    }
  }
}
