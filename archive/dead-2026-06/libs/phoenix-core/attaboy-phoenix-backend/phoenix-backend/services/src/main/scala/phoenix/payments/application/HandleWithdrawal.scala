package phoenix.payments.application

import scala.concurrent.ExecutionContext
import scala.concurrent.Future

import cats.data.EitherT

import phoenix.core.currency.MoneyAmount
import phoenix.core.currency.PositiveAmount
import phoenix.payments.application.NotificationHandlingError.ProcessingError
import phoenix.payments.application.NotificationHandlingError.RefusedByRiskManagement
import phoenix.payments.application.WithdrawalPreconditions.MissingData
import phoenix.payments.application.WithdrawalPreconditions.NotAllowed
import phoenix.payments.application.WithdrawalProcessingErrors._
import phoenix.payments.domain.PaymentStateChangedNotification
import phoenix.payments.domain.StateDefinition._
import phoenix.punters.PunterEntity.PunterId
import phoenix.punters.PuntersBoundedContext
import phoenix.wallets.WalletsBoundedContext
import phoenix.wallets.WalletsBoundedContextProtocol.WithdrawalOutcome.Confirmed
import phoenix.wallets.WalletsBoundedContextProtocol.WithdrawalOutcome.Rejected
import phoenix.wallets.WalletsBoundedContextProtocol._
import phoenix.wallets.domain.Funds.RealMoney

private[payments] final class HandleWithdrawal(punters: PuntersBoundedContext, wallets: WalletsBoundedContext)(implicit
    ec: ExecutionContext)
    extends NotificationHandlerSupport {

  private val preconditions = new WithdrawalPreconditions(punters, wallets)

  def handle(notification: PaymentStateChangedNotification): EitherT[Future, NotificationHandlingError, Unit] =
    notification.stateDefinition match {
      case Created             => attemptReservation(notification)
      case WithdrawnByProvider => confirmWithdrawal(notification)
      case RefusedByProvider   => cancelWithdrawal(notification)
      case AuthorisedByProvider | PendingToBeCaptured | Cancelled | ToBeWithdrawn | WithdrawnToUser | DepositedByUser |
          Expired =>
        ignoreNotification(notification)
    }

  private def attemptReservation(
      notification: PaymentStateChangedNotification): EitherT[Future, NotificationHandlingError, Unit] =
    for {
      _ <- ensurePunterCanWithdraw(notification.punterId, notification.amount.map(_.moneyAmount))
      reservation = WithdrawalReservation(
        reservationId = notification.transactionId.asReservation,
        funds = notification.amount.map(RealMoney(_)),
        paymentMethod = PaymentMethodAdapter.adapt(notification.paymentMethod))
      _ <- reserveFunds(WalletId.deriveFrom(notification.punterId), reservation)
    } yield ()

  private def ensurePunterCanWithdraw(
      punterId: PunterId,
      amount: PositiveAmount[MoneyAmount]): EitherT[Future, NotificationHandlingError, Unit] =
    preconditions.assertPunterCanWithdrawAmount(punterId, amount.value).leftMap {
      case notAllowed: NotAllowed   => RefusedByRiskManagement(notAllowed.reason)
      case missingData: MissingData => ProcessingError(missingData.reason)
    }

  private def reserveFunds(
      walletId: WalletId,
      withdrawalAttempt: WithdrawalReservation): EitherT[Future, NotificationHandlingError, WalletFundsReserved] =
    wallets.reserveForWithdrawal(walletId, withdrawalAttempt).leftMap {
      case InsufficientFundsError(walletId)                       => insufficientFunds(walletId)
      case WalletNotFoundError(walletId)                          => walletNotFound(walletId)
      case ReservationAlreadyExistsError(walletId, reservationId) => reservationAlreadyExists(walletId, reservationId)
    }

  private def confirmWithdrawal(
      notification: PaymentStateChangedNotification): EitherT[Future, NotificationHandlingError, Unit] =
    finalizeWithdrawal(notification, Confirmed(ConfirmationOrigin.PaymentGateway))

  private def cancelWithdrawal(
      notification: PaymentStateChangedNotification): EitherT[Future, NotificationHandlingError, Unit] =
    finalizeWithdrawal(notification, Rejected(RejectionOrigin.PaymentGateway))

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
}
