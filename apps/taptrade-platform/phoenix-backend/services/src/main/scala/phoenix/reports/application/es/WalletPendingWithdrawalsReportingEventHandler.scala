package phoenix.reports.application.es

import scala.concurrent.ExecutionContext
import scala.concurrent.Future

import akka.Done
import akka.projection.eventsourced.EventEnvelope
import cats.syntax.functor._
import org.slf4j.LoggerFactory

import phoenix.projections.ProjectionEventHandler
import phoenix.reports.domain.WalletSummaryRepository
import phoenix.wallets.WalletActorProtocol.events.TransactionEvent
import phoenix.wallets.WalletActorProtocol.events.WalletEvent
import phoenix.wallets.WalletsBoundedContextProtocol.Transaction.{PaymentTransaction => WalletPaymentTransaction}
import phoenix.wallets.WalletsBoundedContextProtocol.TransactionReason.FundsReservedForWithdrawal

// TODO (PHXD-3293): remove after release of PHXD-3293
private[reports] final class WalletPendingWithdrawalsReportingEventHandler(repository: WalletSummaryRepository)(implicit
    ec: ExecutionContext)
    extends ProjectionEventHandler[WalletEvent] {

  override def process(envelope: EventEnvelope[WalletEvent]): Future[Done] =
    WalletPendingWithdrawalsReportingEventHandler.handle(repository, envelope.event).as(Done)
}

private[reports] object WalletPendingWithdrawalsReportingEventHandler {
  private val log = LoggerFactory.getLogger(getClass)

  def handle(repository: WalletSummaryRepository, event: WalletEvent)(implicit ec: ExecutionContext): Future[Unit] =
    event match {
      case event: TransactionEvent
          if event.transaction.isInstanceOf[WalletPaymentTransaction] && event.transaction
            .asInstanceOf[WalletPaymentTransaction]
            .reason == FundsReservedForWithdrawal => {
        repository.recordWalletTransaction(event.walletId.owner, event.transaction).rethrowT
      }

      case _ => Future.successful(log.debug("Received other event {}", event))
    }
}
