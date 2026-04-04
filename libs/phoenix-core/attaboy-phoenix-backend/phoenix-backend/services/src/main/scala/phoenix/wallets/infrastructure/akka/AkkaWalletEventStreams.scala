package phoenix.wallets.infrastructure.akka

import scala.concurrent.Future
import scala.concurrent.duration._

import akka.actor.typed.ActorRef
import akka.actor.typed.ActorSystem
import akka.actor.typed.scaladsl.AskPattern._
import akka.stream.SourceRef
import akka.util.Timeout

import phoenix.core.websocket.EventStream
import phoenix.core.websocket.WebSocketMessageSingleton.GetSourceRef
import phoenix.wallets.WalletsBoundedContextProtocol.WalletId
import phoenix.wallets.domain.WalletStateUpdate

class AkkaWalletEventStreams(getSourceRefActor: ActorRef[GetSourceRef[WalletId, WalletStateUpdate]])(implicit
    system: ActorSystem[_])
    extends EventStream[WalletId, WalletStateUpdate] {

  private implicit val timeout: Timeout = Timeout(2.seconds)

  override def streamStateUpdates(walletId: WalletId): Future[SourceRef[WalletStateUpdate]] =
    getSourceRefActor.ask(replyTo => GetSourceRef(walletId, replyTo))
}
