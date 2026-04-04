package phoenix.wallets.infrastructure.akka

import akka.actor.typed.ActorRef
import akka.actor.typed.ActorSystem
import akka.event.Logging
import akka.persistence.query.Offset
import akka.stream.ActorAttributes
import akka.stream.Attributes
import akka.stream.scaladsl.Flow
import akka.stream.scaladsl.FlowWithContext

import phoenix.core.websocket.Broadcaster
import phoenix.core.websocket.Broadcaster.MessageCollectorFlow
import phoenix.core.websocket.Broadcaster.MessageFilterFlowFactory
import phoenix.core.websocket.WebSocketMessageSingleton.GetSourceRef
import phoenix.core.websocket.WebSocketMessageSingleton.logErrorAndContinue
import phoenix.core.websocket.WebSocketMessageSingleton.spawnSingletonActor
import phoenix.wallets.WalletActorProtocol.events._
import phoenix.wallets.WalletTags.allWalletEventsNotSharded
import phoenix.wallets.WalletsBoundedContext
import phoenix.wallets.WalletsBoundedContextProtocol.WalletId
import phoenix.wallets.domain.WalletStateUpdate
import phoenix.websockets.domain.WebsocketMessageOffsetRepository

object WalletEventsWebsocketMessageSingleton {

  def apply(wallets: WalletsBoundedContext, offsetRepository: WebsocketMessageOffsetRepository)(implicit
      system: ActorSystem[_]): ActorRef[GetSourceRef[WalletId, WalletStateUpdate]] = {

    val messageCollectorFlow: MessageCollectorFlow[WalletEvent, WalletStateUpdate] =
      FlowWithContext[WalletEvent, Offset]
        .map {
          case event: AdjustingFundsDeposited            => Some(event)
          case event: AdjustingFundsWithdrawn            => Some(event)
          case event: FundsDeposited                     => Some(event)
          case event: FundsWithdrawn                     => Some(event)
          case event: FundsReservedForBet                => Some(event)
          case event: FundsReservedForWithdrawal         => Some(event)
          case event: BetVoided                          => Some(event)
          case event: BetPushed                          => Some(event)
          case event: BetCancelled                       => Some(event)
          case event: BetWon                             => Some(event)
          case event: BetLost                            => Some(event)
          case _: WalletCreated                          => None
          case _: ResponsibilityCheckAcceptanceRequested => None
          case _: ResponsibilityCheckAccepted            => None
          case event: WithdrawalCancelled                => Some(event)
          case event: WithdrawalConfirmed                => Some(event)
          case _: BetResettled                           => None
          case _: PunterUnsuspendApproved                => None
          case _: PunterUnsuspendRejected                => None
          case _: NegativeBalance                        => None
        }
        .collect {
          case Some(event) => event
        }
        .mapAsync(parallelism = 1) { event =>
          wallets
            .currentBalance(event.walletId)(system.executionContext)
            .value
            .collect {
              case Right(balance) => WalletStateUpdate(event.walletId, balance)
            }(system.executionContext)
        }
        .log("[WEBSOCKET] WalletEvent")
        .withAttributes(Attributes.logLevels(onElement = Logging.InfoLevel) and ActorAttributes.supervisionStrategy(
          logErrorAndContinue("WalletEvent")))

    val messageFilterFlowFactory: MessageFilterFlowFactory[WalletId, WalletStateUpdate] = walletId =>
      Flow[WalletStateUpdate].filter(_.walletId == walletId)

    val broadcaster =
      Broadcaster(allWalletEventsNotSharded, offsetRepository, messageCollectorFlow, messageFilterFlowFactory)

    spawnSingletonActor(broadcaster, name = "WalletWebSocketMessageSingleton")
  }
}
