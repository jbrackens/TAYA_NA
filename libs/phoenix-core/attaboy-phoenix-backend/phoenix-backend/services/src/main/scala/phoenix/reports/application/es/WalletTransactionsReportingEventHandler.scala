package phoenix.reports.application.es

import scala.concurrent.ExecutionContext
import scala.concurrent.Future

import akka.Done
import akka.projection.eventsourced.EventEnvelope
import cats.syntax.functor._
import org.slf4j.LoggerFactory

import phoenix.projections.ProjectionEventHandler
import phoenix.punters.PunterEntity.AdminId
import phoenix.reports.domain.WalletTransaction
import phoenix.reports.domain.WalletTransactionRepository
import phoenix.reports.domain.model.wallets.TransactionType
import phoenix.wallets.WalletActorProtocol.events.AdjustingFundsDeposited
import phoenix.wallets.WalletActorProtocol.events.AdjustingFundsWithdrawn
import phoenix.wallets.WalletActorProtocol.events.BetCancelled
import phoenix.wallets.WalletActorProtocol.events.BetLost
import phoenix.wallets.WalletActorProtocol.events.BetPushed
import phoenix.wallets.WalletActorProtocol.events.BetResettled
import phoenix.wallets.WalletActorProtocol.events.BetVoided
import phoenix.wallets.WalletActorProtocol.events.BetWon
import phoenix.wallets.WalletActorProtocol.events.FundsDeposited
import phoenix.wallets.WalletActorProtocol.events.FundsReservedForBet
import phoenix.wallets.WalletActorProtocol.events.FundsReservedForWithdrawal
import phoenix.wallets.WalletActorProtocol.events.FundsWithdrawn
import phoenix.wallets.WalletActorProtocol.events.NegativeBalance
import phoenix.wallets.WalletActorProtocol.events.PunterUnsuspendApproved
import phoenix.wallets.WalletActorProtocol.events.PunterUnsuspendRejected
import phoenix.wallets.WalletActorProtocol.events.ResponsibilityCheckAcceptanceRequested
import phoenix.wallets.WalletActorProtocol.events.ResponsibilityCheckAccepted
import phoenix.wallets.WalletActorProtocol.events.TransactionEvent
import phoenix.wallets.WalletActorProtocol.events.WalletCreated
import phoenix.wallets.WalletActorProtocol.events.WalletEvent
import phoenix.wallets.WalletActorProtocol.events.WithdrawalCancelled
import phoenix.wallets.WalletActorProtocol.events.WithdrawalConfirmed
import phoenix.wallets.WalletsBoundedContextProtocol.Transaction.{PaymentTransaction => WalletPaymentTransaction}
import phoenix.wallets.WalletsBoundedContextProtocol.TransactionReason
import phoenix.wallets.domain.PaymentMethod
import phoenix.wallets.domain.PaymentMethod.BackOfficeManualPaymentMethod

private[reports] final class WalletTransactionsReportingEventHandler(repository: WalletTransactionRepository)(implicit
    ec: ExecutionContext)
    extends ProjectionEventHandler[WalletEvent] {

  override def process(envelope: EventEnvelope[WalletEvent]): Future[Done] =
    WalletTransactionsReportingEventHandler.handle(repository, envelope.event).as(Done)
}

private[reports] object WalletTransactionsReportingEventHandler {
  private val log = LoggerFactory.getLogger(getClass)

  def handle(repository: WalletTransactionRepository, event: WalletEvent): Future[Unit] =
    event match {
      case event: AdjustingFundsDeposited =>
        repository.upsert(closedTransaction(event, TransactionType.Deposit))

      case event: AdjustingFundsWithdrawn =>
        repository.upsert(closedTransaction(event, TransactionType.Withdrawal))

      case event: FundsDeposited =>
        repository.upsert(closedTransaction(event, TransactionType.Deposit))

      case event: FundsWithdrawn =>
        repository.upsert(closedTransaction(event, TransactionType.Withdrawal))

      case event: FundsReservedForWithdrawal =>
        repository.upsert(pendingTransaction(event, TransactionType.Withdrawal))

      case event: WithdrawalConfirmed =>
        repository.setClosedAt(event.transaction.transactionId, event.transaction.timestamp)

      case event: WithdrawalCancelled =>
        repository.setClosedAt(event.transaction.transactionId, event.transaction.timestamp)

      case _: WalletCreated | _: BetCancelled | _: BetLost | _: BetVoided | _: BetPushed | _: BetWon |
          _: FundsReservedForBet | _: ResponsibilityCheckAccepted | _: ResponsibilityCheckAcceptanceRequested |
          _: BetResettled | _: PunterUnsuspendApproved | _: PunterUnsuspendRejected | _: NegativeBalance =>
        Future.successful(log.debug("Received other event {}", event))
    }

  private def pendingTransaction(event: TransactionEvent, transactionType: TransactionType): WalletTransaction = {
    val transactionDetails = event match {
      case AdjustingFundsDeposited(_, _, _, paymentMethod, _, _) =>
        extractDetails(paymentMethod)
      case AdjustingFundsWithdrawn(_, _, _, paymentMethod, _, _) =>
        extractDetails(paymentMethod)
      case _: FundsDeposited | _: FundsWithdrawn | _: FundsReservedForWithdrawal | _: WithdrawalConfirmed |
          _: WithdrawalCancelled | _: FundsReservedForBet | _: BetVoided | _: BetPushed | _: BetCancelled | _: BetWon |
          _: BetLost | _: BetResettled =>
        None
    }

    WalletTransaction(
      transactionId = event.transaction.transactionId,
      punterId = event.walletId.owner,
      amount = event.transaction.amount,
      transactionType = transactionType,
      transactionReason = mapReason(event).get,
      startedAt = event.transaction.timestamp,
      closedAt = None,
      backofficeUserId = transactionDetails.map(_._1),
      details = transactionDetails.map(_._2))
  }

  private def mapReason(event: WalletEvent): Option[TransactionReason] =
    event match {
      case transactionEvent: TransactionEvent =>
        transactionEvent.transaction match {
          case transaction: WalletPaymentTransaction => Some(transaction.reason)
          case _                                     => None
        }
      case _ => None
    }

  private def extractDetails(paymentMethod: PaymentMethod): Option[(AdminId, String)] =
    paymentMethod match {
      case BackOfficeManualPaymentMethod(details, backofficeUserId) => Some((backofficeUserId, details))
      case _                                                        => None
    }

  private def closedTransaction(event: TransactionEvent, transactionType: TransactionType): WalletTransaction =
    pendingTransaction(event, transactionType).copy(closedAt = Some(event.transaction.timestamp))
}
