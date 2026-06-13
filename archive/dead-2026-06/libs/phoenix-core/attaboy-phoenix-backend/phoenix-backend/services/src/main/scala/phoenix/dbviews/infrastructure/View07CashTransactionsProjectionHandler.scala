package phoenix.dbviews.infrastructure

import scala.concurrent.ExecutionContext
import scala.concurrent.Future

import akka.Done
import akka.projection.eventsourced.EventEnvelope
import org.slf4j.Logger

import phoenix.core.currency.MoneyAmount
import phoenix.dbviews.domain.model.CashTransaction
import phoenix.dbviews.domain.model.TransactionDescription
import phoenix.dbviews.domain.model.TransactionProvider
import phoenix.dbviews.domain.model.TransactionSource
import phoenix.dbviews.domain.model.TransactionType
import phoenix.projections.ProjectionEventHandler
import phoenix.wallets.WalletActorProtocol.events.NegativeBalance
import phoenix.wallets.WalletActorProtocol.events.PunterUnsuspendApproved
import phoenix.wallets.WalletActorProtocol.events.PunterUnsuspendRejected
import phoenix.wallets.WalletActorProtocol.events.ResponsibilityCheckAcceptanceRequested
import phoenix.wallets.WalletActorProtocol.events.ResponsibilityCheckAccepted
import phoenix.wallets.WalletActorProtocol.events.TransactionEvent
import phoenix.wallets.WalletActorProtocol.events.WalletCreated
import phoenix.wallets.WalletActorProtocol.events.WalletEvent
import phoenix.wallets.WalletsBoundedContextProtocol.Transaction.BetTransaction
import phoenix.wallets.WalletsBoundedContextProtocol.Transaction.PaymentTransaction
import phoenix.wallets.WalletsBoundedContextProtocol.TransactionReason.AdjustingFundsDeposited
import phoenix.wallets.WalletsBoundedContextProtocol.TransactionReason.AdjustingFundsWithdrawn
import phoenix.wallets.WalletsBoundedContextProtocol.TransactionReason.FundsDeposited
import phoenix.wallets.WalletsBoundedContextProtocol.TransactionReason.FundsReservedForWithdrawal
import phoenix.wallets.WalletsBoundedContextProtocol.TransactionReason.FundsWithdrawn
import phoenix.wallets.WalletsBoundedContextProtocol.TransactionReason.WithdrawalCancelled
import phoenix.wallets.WalletsBoundedContextProtocol.TransactionReason.WithdrawalConfirmed
import phoenix.wallets.domain.PaymentMethod.BackOfficeManualPaymentMethod
import phoenix.wallets.domain.PaymentMethod.BankTransferPaymentMethod
import phoenix.wallets.domain.PaymentMethod.CashDepositPaymentMethod
import phoenix.wallets.domain.PaymentMethod.CashWithdrawalPaymentMethod
import phoenix.wallets.domain.PaymentMethod.ChequeWithdrawalPaymentMethod
import phoenix.wallets.domain.PaymentMethod.CreditCardPaymentMethod
import phoenix.wallets.domain.PaymentMethod.NotApplicablePaymentMethod

class View07CashTransactionsProjectionHandler(repository: SlickView07CashTransactionsRepository, log: Logger)(implicit
    ec: ExecutionContext)
    extends ProjectionEventHandler[WalletEvent] {
  override def process(envelope: EventEnvelope[WalletEvent]): Future[Done] = {
    envelope.event match {
      case event: TransactionEvent =>
        event.transaction match {
          case PaymentTransaction(transactionId, reason, requestedAmount, paymentMethod, _, timestamp) =>
            log.info(s"Handling cash transaction: $event")
            val transactionType = reason match {
              case AdjustingFundsDeposited    => TransactionType.Deposit
              case AdjustingFundsWithdrawn    => TransactionType.Withdrawal
              case FundsDeposited             => TransactionType.Deposit
              case FundsReservedForWithdrawal => TransactionType.Withdrawal
              case FundsWithdrawn             => TransactionType.Withdrawal
              case WithdrawalCancelled        => TransactionType.Withdrawal
              case WithdrawalConfirmed        => TransactionType.Withdrawal
            }
            val description = reason match {
              case AdjustingFundsDeposited    => TransactionDescription.Approved
              case AdjustingFundsWithdrawn    => TransactionDescription.Approved
              case FundsDeposited             => TransactionDescription.Approved
              case FundsReservedForWithdrawal => TransactionDescription.Pending
              case FundsWithdrawn             => TransactionDescription.Approved
              case WithdrawalCancelled        => TransactionDescription.Void
              case WithdrawalConfirmed        => TransactionDescription.Approved
            }
            val (source, provider) = paymentMethod match {
              case CreditCardPaymentMethod => (Some(TransactionSource.CreditCard), Some(TransactionProvider.Visa))
              case BankTransferPaymentMethod =>
                (Some(TransactionSource.BankAccount), Some(TransactionProvider.BankWireTransfer))
              case CashWithdrawalPaymentMethod =>
                (Some(TransactionSource.Cash), Some(TransactionProvider.CashAtCasinoCage))
              case CashDepositPaymentMethod =>
                (Some(TransactionSource.Cash), Some(TransactionProvider.CashAtCasinoCage))
              case ChequeWithdrawalPaymentMethod =>
                (Some(TransactionSource.BankAccount), None) // Doesn't seem to be a good "provider" listed
              case BackOfficeManualPaymentMethod(_, _) => (None, None)
              case NotApplicablePaymentMethod          => (None, None)
            }
            val cashTransaction = CashTransaction(
              punterId = event.walletId.owner,
              transactionId = transactionId,
              timestamp = timestamp,
              transactionType = transactionType,
              description = description,
              amount = if (description == TransactionDescription.Approved) requestedAmount else MoneyAmount.zero.get,
              requestedAmount = requestedAmount,
              source = source,
              provider = provider)
            repository.upsert(cashTransaction).map(_ => Done)
          case BetTransaction(_, _, _, _, _, _) => Future.successful(Done)
        }
      case NegativeBalance(_) | PunterUnsuspendApproved(_) | PunterUnsuspendRejected(_) |
          ResponsibilityCheckAcceptanceRequested(_) | ResponsibilityCheckAccepted(_) | WalletCreated(_, _, _) =>
        Future.successful(Done)
    }
  }
}
