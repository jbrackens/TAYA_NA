package phoenix.markets.support

import scala.concurrent.Future

import akka.stream.Materializer
import akka.stream.SourceRef
import akka.stream.scaladsl.Source
import akka.stream.scaladsl.StreamRefs

import phoenix.core.websocket.EventStream
import phoenix.markets.MarketsBoundedContext.FixtureStateUpdate
import phoenix.markets.sports.SportEntity.FixtureId

object FixtureEventStreamMock {

  def successful(implicit mat: Materializer) =
    new EventStream[FixtureId, FixtureStateUpdate] {
      override def streamStateUpdates(fixtureId: FixtureId): Future[SourceRef[FixtureStateUpdate]] =
        Future.successful(Source.empty.runWith(StreamRefs.sourceRef()))
    }

  def failing =
    new EventStream[FixtureId, FixtureStateUpdate] {
      override def streamStateUpdates(fixtureId: FixtureId): Future[SourceRef[FixtureStateUpdate]] =
        Future.failed(new RuntimeException("FixtureEventStreams has failed..."))
    }
}
