package phoenix.markets.fixtures.infrastructure.akka

import scala.concurrent.Future
import scala.concurrent.duration._

import akka.actor.typed.ActorRef
import akka.actor.typed.ActorSystem
import akka.actor.typed.scaladsl.AskPattern._
import akka.stream.SourceRef
import akka.util.Timeout

import phoenix.core.websocket.EventStream
import phoenix.core.websocket.WebSocketMessageSingleton.GetSourceRef
import phoenix.markets.MarketsBoundedContext.FixtureStateUpdate
import phoenix.markets.sports.SportEntity.FixtureId

class AkkaFixtureEventStreams(getSourceRefActor: ActorRef[GetSourceRef[FixtureId, FixtureStateUpdate]])(implicit
    system: ActorSystem[_])
    extends EventStream[FixtureId, FixtureStateUpdate] {

  private implicit val timeout: Timeout = Timeout(2.seconds)

  override def streamStateUpdates(fixtureId: FixtureId): Future[SourceRef[FixtureStateUpdate]] =
    getSourceRefActor.ask(replyTo => GetSourceRef(fixtureId, replyTo))
}
