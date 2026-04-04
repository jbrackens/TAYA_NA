package phoenix.markets.infrastructure.akka
import akka.actor.typed.ActorRef
import akka.actor.typed.ActorSystem
import akka.event.Logging
import akka.persistence.query.Offset
import akka.stream._
import akka.stream.scaladsl._

import phoenix.core.websocket.Broadcaster
import phoenix.core.websocket.Broadcaster.MessageCollectorFlow
import phoenix.core.websocket.Broadcaster.MessageFilterFlowFactory
import phoenix.core.websocket.WebSocketMessageSingleton.GetSourceRef
import phoenix.core.websocket.WebSocketMessageSingleton.logErrorAndContinue
import phoenix.core.websocket.WebSocketMessageSingleton.spawnSingletonActor
import phoenix.markets.MarketProtocol.Events.MarketCreated
import phoenix.markets.MarketProtocol.Events.MarketEvent
import phoenix.markets.MarketProtocol.Events.MarketInfoChanged
import phoenix.markets.MarketProtocol.Events.MarketLifecycleEvent
import phoenix.markets.MarketProtocol.Events.MarketOddsChanged
import phoenix.markets.MarketTags.allMarketEventsNotSharded
import phoenix.markets.MarketsBoundedContext
import phoenix.markets.MarketsBoundedContext.MarketId
import phoenix.markets.MarketsBoundedContext.MarketStateUpdate
import phoenix.websockets.domain.WebsocketMessageOffsetRepository

object MarketEventsWebsocketSingleton {

  def apply(markets: MarketsBoundedContext, offsetRepository: WebsocketMessageOffsetRepository)(implicit
      system: ActorSystem[_]): ActorRef[GetSourceRef[MarketId, MarketStateUpdate]] = {

    val messageCollectorFlow: MessageCollectorFlow[MarketEvent, MarketStateUpdate] = {
      FlowWithContext[MarketEvent, Offset]
        .map {
          case event: MarketOddsChanged    => Some(event)
          case event: MarketInfoChanged    => Some(event)
          case event: MarketLifecycleEvent => Some(event)
          case _: MarketCreated            => None
        }
        .collect {
          case Some(event) => event
        }
        .mapAsync(parallelism = 1) { event =>
          markets
            .getMarketState(event.marketId)(system.executionContext)
            .value
            .collect {
              case Right(marketState) => MarketStateUpdate.fromInitializedMarket(marketState)
            }(system.executionContext)
        }
        .log("[WEBSOCKET] MarketEvent")
        .withAttributes(Attributes.logLevels(onElement = Logging.InfoLevel) and ActorAttributes.supervisionStrategy(
          logErrorAndContinue("MarketEvent")))

    }

    val messageFilterFlowFactory: MessageFilterFlowFactory[MarketId, MarketStateUpdate] = marketId =>
      Flow[MarketStateUpdate].filter(_.marketId == marketId)

    val broadcaster =
      Broadcaster(allMarketEventsNotSharded, offsetRepository, messageCollectorFlow, messageFilterFlowFactory)

    spawnSingletonActor(broadcaster, name = "MarketWebSocketMessageSingleton")
  }
}
