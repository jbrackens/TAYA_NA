package phoenix.payments.application

import scala.concurrent.ExecutionContext
import scala.concurrent.Future

import cats.data.EitherT

import phoenix.core.currency.MoneyAmount
import phoenix.payments.application.NotificationHandlingError.ProcessingError
import phoenix.payments.application.NotificationHandlingError.RefusedByRiskManagement
import phoenix.payments.application.WithdrawalPreconditions.MissingData
import phoenix.payments.application.WithdrawalPreconditions.NotAllowed
import phoenix.payments.application.WithdrawalProcessingErrors.reservationNotFound
import phoenix.payments.application.WithdrawalProcessingErrors.walletNotFound
import phoenix.payments.domain.CashWithdrawalIdentifier
import phoenix.payments.domain.CashWithdrawalReservationsRepository
import phoenix.payments.domain.PaymentStateChangedNotification
import phoenix.payments.domain.StateDefinition.AuthorisedByProvider
import phoenix.payments.domain.StateDefinition.Cancelled
import phoenix.payments.domain.StateDefinition.Created
import phoenix.payments.domain.StateDefinition.DepositedByUser
import phoenix.payments.domain.StateDefinition.Expired
import phoenix.payments.domain.StateDefinition.PendingToBeCaptured
import phoenix.payments.domain.StateDefinition.RefusedByProvider
import phoenix.payments.domain.StateDefinition.ToBeWithdrawn
import phoenix.payments.domain.StateDefinition.WithdrawnByProvider
import phoenix.payments.domain.StateDefinition.WithdrawnToUser
import phoenix.punters.PunterEntity.PunterId
import phoenix.punters.PuntersBoundedContext
import phoenix.wallets.WalletsBoundedContext
import phoenix.wallets.WalletsBoundedContextProtocol.ConfirmationOrigin
import phoenix.wallets.WalletsBoundedContextProtocol.RejectionOrigin
import phoenix.wallets.WalletsBoundedContextProtocol.ReservationNotFoundError
import phoenix.wallets.WalletsBoundedContextProtocol.WalletId
import phoenix.wallets.WalletsBoundedContextProtocol.WalletNotFoundError
import phoenix.wallets.WalletsBoundedContextProtocol.WithdrawalOutcome
import phoenix.wallets.WalletsBoundedContextProtocol.WithdrawalOutcome.Confirmed
import phoenix.wallets.WalletsBoundedContextProtocol.WithdrawalOutcome.Rejected

private[payments] final class HandleCashWithdrawal(
    punters: PuntersBoundedContext,
    wallets: WalletsBoundedContext,
    reservationsRepository: CashWithdrawalReservationsRepository)(implicit ec: ExecutionContext)
    extends NotificationHandlerSupport {

  private val preconditions = new WithdrawalPreconditions(punters, wallets)

  def handle(notification: PaymentStateChangedNotification): EitherT[Future, NotificationHandlingError, Unit] = {
    notification.stateDefinition match {
      case WithdrawnToUser => confirmWithdrawal(notification)
      case Expired         => cancelWithdrawal(notification)
      case AuthorisedByProvider | PendingToBeCaptured | Cancelled | Created | WithdrawnByProvider | RefusedByProvider |
          ToBeWithdrawn | DepositedByUser =>
        ignoreNotification(notification)
    }
  }

  private def confirmWithdrawal(
      notification: PaymentStateChangedNotification): EitherT[Future, NotificationHandlingError, Unit] =
    for {
      _ <- ensurePunterCanWithdraw(notification.punterId, notification.amount.value.moneyAmount)
      _ <- finalizeWithdrawal(notification, Confirmed(ConfirmationOrigin.PaymentGateway))
      _ <- removeReservation(CashWithdrawalIdentifier(notification.transactionId.value))
    } yield ()

  private def cancelWithdrawal(
      notification: PaymentStateChangedNotification): EitherT[Future, NotificationHandlingError, Unit] =
    for {
      _ <- finalizeWithdrawal(notification, Rejected(RejectionOrigin.PaymentGateway))
      _ <- removeReservation(CashWithdrawalIdentifier(notification.transactionId.value))
    } yield ()

  private def ensurePunterCanWithdraw(
      punterId: PunterId,
      amount: MoneyAmount): EitherT[Future, NotificationHandlingError, Unit] =
    preconditions.assertPunterCanWithdrawAmountWithCash(punterId, amount).leftMap {
      case notAllowed: NotAllowed   => RefusedByRiskManagement(notAllowed.reason)
      case missingData: MissingData => ProcessingError(missingData.reason)
    }

  private def finalizeWithdrawal(
      notification: PaymentStateChangedNotification,
      outcome: WithdrawalOutcome): EitherT[Future, NotificationHandlingError, Unit] = {
    val walletId = WalletId.deriveFrom(notification.punterId)

    wallets
      .finalizeWithdrawal(walletId, notification.transactionId.asReservation, outcome)
      .leftMap[NotificationHandlingError] {
        case ReservationNotFoundError(walletId, reservationId) => reservationNotFound(walletId, reservationId)
        case WalletNotFoundError(walletId)                     => walletNotFound(walletId)
      }
      .map(_ => ())
  }

  private def removeReservation(
      cashWithdrawalIdentifier: CashWithdrawalIdentifier): EitherT[Future, NotificationHandlingError, Unit] =
    EitherT.liftF(reservationsRepository.remove(cashWithdrawalIdentifier))

}
