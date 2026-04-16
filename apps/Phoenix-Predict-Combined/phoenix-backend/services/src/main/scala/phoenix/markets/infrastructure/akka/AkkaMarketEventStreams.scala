package phoenix.markets.infrastructure.akka

import scala.concurrent.Future
import scala.concurrent.duration._

import akka.actor.typed.ActorRef
import akka.actor.typed.ActorSystem
import akka.actor.typed.scaladsl.AskPattern._
import akka.stream.SourceRef
import akka.util.Timeout

import phoenix.core.websocket.EventStream
import phoenix.core.websocket.WebSocketMessageSingleton.GetSourceRef
import phoenix.markets.MarketsBoundedContext.MarketId
import phoenix.markets.MarketsBoundedContext.MarketStateUpdate

class AkkaMarketEventStreams(getSourceRefActor: ActorRef[GetSourceRef[MarketId, MarketStateUpdate]])(implicit
    system: ActorSystem[_])
    extends EventStream[MarketId, MarketStateUpdate] {

  private implicit val timeout: Timeout = Timeout(2.seconds)

  override def streamStateUpdates(marketId: MarketId): Future[SourceRef[MarketStateUpdate]] =
    getSourceRefActor.ask(replyTo => GetSourceRef(marketId, replyTo))
}
