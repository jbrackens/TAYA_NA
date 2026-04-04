package phoenix.bets.infrastructure.akka

import scala.concurrent.Future
import scala.concurrent.duration._

import akka.actor.typed.ActorRef
import akka.actor.typed.ActorSystem
import akka.actor.typed.scaladsl.AskPattern._
import akka.stream.SourceRef
import akka.util.Timeout

import phoenix.bets.BetStateUpdate
import phoenix.core.websocket.EventStream
import phoenix.core.websocket.WebSocketMessageSingleton.GetSourceRef
import phoenix.punters.PunterEntity.PunterId

final class AkkaBetEventStreams(getSourceRefActor: ActorRef[GetSourceRef[PunterId, BetStateUpdate]])(implicit
    system: ActorSystem[_])
    extends EventStream[PunterId, BetStateUpdate] {

  private implicit val timeout: Timeout = Timeout(2.seconds)

  def streamStateUpdates(id: PunterId): Future[SourceRef[BetStateUpdate]] = {
    getSourceRefActor.ask(replyTo => GetSourceRef(id, replyTo))
  }
}
