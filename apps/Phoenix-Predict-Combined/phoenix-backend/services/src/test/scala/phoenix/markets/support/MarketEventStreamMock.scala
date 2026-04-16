package phoenix.markets.support

import scala.concurrent.Future

import akka.stream.Materializer
import akka.stream.SourceRef
import akka.stream.scaladsl.Source
import akka.stream.scaladsl.StreamRefs

import phoenix.core.websocket.EventStream
import phoenix.markets.MarketsBoundedContext.MarketId
import phoenix.markets.MarketsBoundedContext.MarketStateUpdate

object MarketEventStreamMock {

  def successful(implicit mat: Materializer) =
    new EventStream[MarketId, MarketStateUpdate] {
      override def streamStateUpdates(marketId: MarketId): Future[SourceRef[MarketStateUpdate]] =
        Future.successful(Source.empty.runWith(StreamRefs.sourceRef()))
    }

  def failing =
    new EventStream[MarketId, MarketStateUpdate] {
      override def streamStateUpdates(marketId: MarketId): Future[SourceRef[MarketStateUpdate]] =
        Future.failed(new RuntimeException("MarketEventStreams has failed..."))
    }
}
