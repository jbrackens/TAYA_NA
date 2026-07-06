package phoenix.markets.fixtures.infrastructure.akka

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
import phoenix.markets.MarketsBoundedContext.FixtureStateUpdate
import phoenix.markets.sports.SportEntity.FixtureId
import phoenix.markets.sports.SportProtocol.Events.FixtureEvent
import phoenix.markets.sports.SportProtocol.Events.FixtureStateChanged
import phoenix.markets.sports.SportTags.allSportEventsNotSharded
import phoenix.websockets.domain.WebsocketMessageOffsetRepository

object FixtureEventsWebsocketSingleton {

  def apply(offsetRepository: WebsocketMessageOffsetRepository)(implicit
      system: ActorSystem[_]): ActorRef[GetSourceRef[FixtureId, FixtureStateUpdate]] = {

    val messageCollectorFlow: MessageCollectorFlow[FixtureEvent, FixtureStateUpdate] =
      FlowWithContext[FixtureEvent, Offset]
        .collect {
          case event: FixtureStateChanged => event
        }
        .map { event =>
          FixtureStateUpdate(
            event.fixtureId,
            event.fixture.name,
            event.fixture.startTime,
            event.fixture.fixtureLifecycleStatus,
            event.fixture.currentScore)
        }
        .log("[WEBSOCKET] FixtureEvent")
        .withAttributes(Attributes.logLevels(onElement = Logging.InfoLevel) and ActorAttributes.supervisionStrategy(
          logErrorAndContinue("FixtureEvent")))

    val messageFilterFlowFactory: MessageFilterFlowFactory[FixtureId, FixtureStateUpdate] = fixtureId =>
      Flow[FixtureStateUpdate].filter(_.id == fixtureId)

    val broadcaster =
      Broadcaster(allSportEventsNotSharded, offsetRepository, messageCollectorFlow, messageFilterFlowFactory)

    spawnSingletonActor(broadcaster, name = "FixtureWebSocketMessageSingleton")
  }
}
