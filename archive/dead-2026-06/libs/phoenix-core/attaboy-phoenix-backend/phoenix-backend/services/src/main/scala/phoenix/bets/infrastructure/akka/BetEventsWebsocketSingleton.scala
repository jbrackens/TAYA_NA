package phoenix.bets.infrastructure.akka

import akka.actor.typed.ActorRef
import akka.actor.typed.ActorSystem
import akka.event.Logging
import akka.persistence.query.Offset
import akka.stream.ActorAttributes
import akka.stream.Attributes
import akka.stream.scaladsl.Flow
import akka.stream.scaladsl.FlowWithContext

import phoenix.bets.BetProtocol.Events._
import phoenix.bets.BetStateUpdate
import phoenix.bets.BetTags
import phoenix.bets.infrastructure.BetValidationErrorMapping.betValidationErrorToString
import phoenix.core.websocket.Broadcaster
import phoenix.core.websocket.Broadcaster.MessageCollectorFlow
import phoenix.core.websocket.Broadcaster.MessageFilterFlowFactory
import phoenix.core.websocket.WebSocketMessageSingleton.GetSourceRef
import phoenix.core.websocket.WebSocketMessageSingleton.logErrorAndContinue
import phoenix.core.websocket.WebSocketMessageSingleton.spawnSingletonActor
import phoenix.punters.PunterEntity.PunterId
import phoenix.websockets.domain.WebsocketMessageOffsetRepository

object BetEventsWebsocketSingleton {

  val messageCollectorFlow: MessageCollectorFlow[BetEvent, BetStateUpdate] =
    FlowWithContext[BetEvent, Offset].map {
      case BetFailed(betId, betData, reasons) =>
        BetStateUpdate.betStateUpdateFailed(betId, betData, reasons.map(betValidationErrorToString).mkString(","))
      case BetOpened(betId, betData, _, _, _) =>
        BetStateUpdate.betStateUpdateOpened(betId, betData)
      case BetSettled(betId, betData, _, winner) =>
        BetStateUpdate.betStateUpdateSettled(betId, betData, winner)
      case BetResettled(betId, betData, winner, _) =>
        BetStateUpdate.betStateUpdateResettled(betId, betData, winner)
      case BetVoided(betId, betData, _) =>
        BetStateUpdate.betStateUpdateVoided(betId, betData)
      case BetPushed(betId, betData, _) =>
        BetStateUpdate.betStateUpdatePushed(betId, betData)
      case BetCancelled(betId, betData, _, _, _, _) =>
        BetStateUpdate.betStateUpdateCancelled(betId, betData)
    }

  val messageFilterFlowFactory: MessageFilterFlowFactory[PunterId, BetStateUpdate] = punterId =>
    Flow[BetStateUpdate].filter(_.betData.punterId == punterId)

  def apply(offsetRepository: WebsocketMessageOffsetRepository)(implicit
      system: ActorSystem[_]): ActorRef[GetSourceRef[PunterId, BetStateUpdate]] = {

    val messageCollectorFlowWithLogging = messageCollectorFlow
      .log("[WEBSOCKET] BetEvent")
      .withAttributes(
        Attributes.logLevels(onElement = Logging.InfoLevel) and ActorAttributes.supervisionStrategy(
          logErrorAndContinue("BetEvent")))

    val broadcaster =
      Broadcaster[PunterId, BetEvent, BetStateUpdate](
        BetTags.allBetEventsNotSharded,
        offsetRepository,
        messageCollectorFlowWithLogging,
        messageFilterFlowFactory)

    spawnSingletonActor(broadcaster, name = "BetWebSocketMessageSingleton")
  }
}
