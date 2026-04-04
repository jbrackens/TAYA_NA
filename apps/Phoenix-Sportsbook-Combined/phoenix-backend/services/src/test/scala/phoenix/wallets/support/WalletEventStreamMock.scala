package phoenix.wallets.support

import scala.concurrent.Future

import akka.stream.Materializer
import akka.stream.SourceRef
import akka.stream.scaladsl.Source
import akka.stream.scaladsl.StreamRefs

import phoenix.core.websocket.EventStream
import phoenix.wallets.WalletsBoundedContextProtocol.WalletId
import phoenix.wallets.domain.WalletStateUpdate

object WalletEventStreamMock {

  def successful(implicit mat: Materializer) =
    new EventStream[WalletId, WalletStateUpdate] {
      override def streamStateUpdates(walletId: WalletId): Future[SourceRef[WalletStateUpdate]] =
        Future.successful(Source.empty.runWith(StreamRefs.sourceRef()))
    }

  def failing =
    new EventStream[WalletId, WalletStateUpdate] {
      override def streamStateUpdates(walletId: WalletId): Future[SourceRef[WalletStateUpdate]] =
        Future.failed(new RuntimeException("FixtureEventStreams has failed..."))
    }
}
