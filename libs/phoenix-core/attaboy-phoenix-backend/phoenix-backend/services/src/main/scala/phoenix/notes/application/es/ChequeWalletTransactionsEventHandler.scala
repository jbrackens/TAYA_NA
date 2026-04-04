package phoenix.notes.application.es

import scala.concurrent.ExecutionContext
import scala.concurrent.Future

import akka.Done
import akka.projection.eventsourced.EventEnvelope
import cats.syntax.functor._
import org.slf4j.Logger
import org.slf4j.LoggerFactory

import phoenix.core.ScalaObjectUtils._
import phoenix.core.currency.formatForDisplay
import phoenix.notes.application.InsertNotes
import phoenix.notes.domain.NoteText
import phoenix.projections.ProjectionEventHandler
import phoenix.wallets.WalletActorProtocol.events.FundsDeposited
import phoenix.wallets.WalletActorProtocol.events.FundsWithdrawn
import phoenix.wallets.WalletActorProtocol.events.WalletEvent
import phoenix.wallets.WalletActorProtocol.events._
import phoenix.wallets.WalletsBoundedContextProtocol.ConfirmationOrigin
import phoenix.wallets.WalletsBoundedContextProtocol.RejectionOrigin
import phoenix.wallets.WalletsBoundedContextProtocol.Transaction
import phoenix.wallets.domain.PaymentMethod

private[notes] final class ChequeWalletTransactionsEventHandler(insertNotes: InsertNotes)(implicit ec: ExecutionContext)
    extends ProjectionEventHandler[WalletEvent] {

  override def process(envelope: EventEnvelope[WalletEvent]): Future[Done] =
    ChequeWalletTransactionsEventHandler.handle(insertNotes)(envelope.event).as(Done)
}

private[notes] object ChequeWalletTransactionsEventHandler {
  private val log: Logger = LoggerFactory.getLogger(this.objectName)

  def handle(insertNotes: InsertNotes)(event: WalletEvent)(implicit ec: ExecutionContext): Future[Unit] =
    event match {
      case event: FundsReservedForWithdrawal
          if event.withdrawal.paymentMethod == PaymentMethod.ChequeWithdrawalPaymentMethod =>
        insertNotes
          .insertSystemNote(punterId = event.walletId.owner, text = chequeTransactionInitiatedNote(event.transaction))
          .void

      case event @ WithdrawalConfirmed(_, _, confirmedBy: ConfirmationOrigin.BackofficeWorker, _, _)
          if event.withdrawal.paymentMethod == PaymentMethod.ChequeWithdrawalPaymentMethod =>
        insertNotes
          .insertManualNote(
            punterId = event.walletId.owner,
            text = chequeTransactionAcceptedNote(event.transaction),
            author = confirmedBy.adminId)
          .void

      case event @ WithdrawalCancelled(_, _, rejectedBy: RejectionOrigin.BackofficeWorker, _, _)
          if event.withdrawal.paymentMethod == PaymentMethod.ChequeWithdrawalPaymentMethod =>
        insertNotes
          .insertManualNote(
            punterId = event.walletId.owner,
            text = chequeTransactionRejectedNote(event.transaction, rejectedBy),
            author = rejectedBy.adminId)
          .void

      case _: FundsDeposited | _: AdjustingFundsDeposited | _: AdjustingFundsWithdrawn | _: FundsWithdrawn |
          _: FundsReservedForWithdrawal | _: WithdrawalConfirmed | _: WithdrawalCancelled | _: FundsReservedForBet |
          _: BetVoided | _: BetPushed | _: BetCancelled | _: BetWon | _: BetLost | _: WalletCreated |
          _: ResponsibilityCheckAccepted | _: ResponsibilityCheckAcceptanceRequested | _: BetResettled |
          _: PunterUnsuspendApproved | _: PunterUnsuspendRejected | _: NegativeBalance =>
        Future.successful(
          log.debug(s"Ignoring $event, irrelevant for ${ChequeWalletTransactionsEventHandler.objectName}"))
    }

  private def chequeTransactionInitiatedNote(transaction: Transaction): NoteText =
    NoteText.unsafe(s"Cheque withdrawal initiated - $$${formatForDisplay(transaction.amount.amount)} amount")

  private def chequeTransactionAcceptedNote(transaction: Transaction): NoteText =
    NoteText.unsafe(s"Cheque withdrawal accepted - $$${formatForDisplay(transaction.amount.amount)} amount")

  private def chequeTransactionRejectedNote(
      transaction: Transaction,
      rejectedBy: RejectionOrigin.BackofficeWorker): NoteText =
    NoteText.unsafe(
      s"Cheque withdrawal rejected - $$${formatForDisplay(transaction.amount.amount)} amount, reason: '${rejectedBy.reason}'")
}
