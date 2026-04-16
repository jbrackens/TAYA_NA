package phoenix.bets.support

import scala.concurrent.Future

import akka.stream.Materializer
import akka.stream.SourceRef
import akka.stream.scaladsl.Source
import akka.stream.scaladsl.StreamRefs

import phoenix.bets.BetStateUpdate
import phoenix.core.websocket.EventStream
import phoenix.punters.PunterEntity
import phoenix.punters.PunterEntity.PunterId

object BetEventStreamMock {

  def successful(implicit mat: Materializer) =
    new EventStream[PunterId, BetStateUpdate] {
      override def streamStateUpdates(id: PunterEntity.PunterId): Future[SourceRef[BetStateUpdate]] =
        Future.successful(Source.empty.runWith(StreamRefs.sourceRef()))
    }

  def failing =
    new EventStream[PunterId, BetStateUpdate] {
      override def streamStateUpdates(id: PunterId): Future[SourceRef[BetStateUpdate]] =
        Future.failed(new RuntimeException("FixtureEventStreams has failed..."))
    }
}
