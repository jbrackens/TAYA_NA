package phoenix.reports.application.es

import scala.concurrent.ExecutionContext
import scala.concurrent.Future

import akka.Done
import akka.projection.eventsourced.EventEnvelope
import org.slf4j.LoggerFactory

import phoenix.projections.ProjectionEventHandler
import phoenix.reports.domain.WalletSummaryRepository
import phoenix.wallets.WalletActorProtocol.events.NegativeBalance
import phoenix.wallets.WalletActorProtocol.events.PunterUnsuspendApproved
import phoenix.wallets.WalletActorProtocol.events.PunterUnsuspendRejected
import phoenix.wallets.WalletActorProtocol.events.ResponsibilityCheckAcceptanceRequested
import phoenix.wallets.WalletActorProtocol.events.ResponsibilityCheckAccepted
import phoenix.wallets.WalletActorProtocol.events.TransactionEvent
import phoenix.wallets.WalletActorProtocol.events.WalletCreated
import phoenix.wallets.WalletActorProtocol.events.WalletEvent

final class WalletsReportingEventHandler(walletsRepository: WalletSummaryRepository)(implicit ec: ExecutionContext)
    extends ProjectionEventHandler[WalletEvent] {

  override def process(envelope: EventEnvelope[WalletEvent]): Future[Done] =
    WalletsReportingEventHandler.handle(walletsRepository, envelope.event).map(_ => Done)
}

private[reports] object WalletsReportingEventHandler {
  private val log = LoggerFactory.getLogger(getClass)

  def handle(walletsRepository: WalletSummaryRepository, event: WalletEvent)(implicit
      ec: ExecutionContext): Future[Unit] =
    event match {
      case WalletCreated(walletId, balance, createdAt) =>
        walletsRepository.createWallet(walletId.owner, balance, createdAt).rethrowT

      case transactionEvent: TransactionEvent =>
        walletsRepository
          .recordWalletTransaction(transactionEvent.walletId.owner, transactionEvent.transaction)
          .rethrowT

      case _: ResponsibilityCheckAccepted | _: ResponsibilityCheckAcceptanceRequested | _: PunterUnsuspendApproved |
          _: PunterUnsuspendRejected | _: NegativeBalance =>
        Future.successful(log.debug("Received other event {}", event))
    }
}
