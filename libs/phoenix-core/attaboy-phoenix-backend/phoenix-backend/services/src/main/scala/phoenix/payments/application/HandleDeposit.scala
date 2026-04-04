package phoenix.payments.application

import scala.concurrent.ExecutionContext
import scala.concurrent.Future

import cats.data.EitherT

import phoenix.payments.application.DepositPreconditions.DepositPreconditionsError
import phoenix.payments.application.DepositPreconditions.MissingData
import phoenix.payments.application.DepositPreconditions.NotAllowed
import phoenix.payments.application.NotificationHandlingError.ProcessingError
import phoenix.payments.application.NotificationHandlingError.RefusedByRiskManagement
import phoenix.payments.domain.PaymentId
import phoenix.payments.domain.PaymentStateChangedNotification
import phoenix.payments.domain.PaymentsService
import phoenix.payments.domain.StateDefinition._
import phoenix.punters.PuntersBoundedContext
import phoenix.wallets.WalletsBoundedContext
import phoenix.wallets.WalletsBoundedContextProtocol.WalletId
import phoenix.wallets.WalletsBoundedContextProtocol.WalletNotFoundError
import phoenix.wallets.domain.CreditFundsReason
import phoenix.wallets.domain.Funds.RealMoney

private[payments] final class HandleDeposit(
    punters: PuntersBoundedContext,
    wallets: WalletsBoundedContext,
    payments: PaymentsService)(implicit ec: ExecutionContext)
    extends NotificationHandlerSupport {

  private val preconditions = new DepositPreconditions(punters, wallets)

  def handle(notification: PaymentStateChangedNotification): EitherT[Future, NotificationHandlingError, Unit] =
    notification.stateDefinition match {
      case AuthorisedByProvider => validateDeposit(notification)
      case PendingToBeCaptured  => confirmDeposit(notification)
      case Cancelled            => onCancellation
      case Created | WithdrawnByProvider | RefusedByProvider | ToBeWithdrawn | WithdrawnToUser | DepositedByUser |
          Expired =>
        ignoreNotification(notification)
    }

  private def validateDeposit(
      notification: PaymentStateChangedNotification): EitherT[Future, NotificationHandlingError, Unit] =
    preconditions
      .assertPunterCanDepositAmount(notification.punterId, notification.amount.value.moneyAmount)
      .biflatMap(
        notAllowed => reportCancellationToProvider(notification.paymentId, notAllowed),
        _ => reportConfirmationToProvider(notification.paymentId))

  private def reportCancellationToProvider(
      paymentId: PaymentId,
      error: DepositPreconditionsError): EitherT[Future, NotificationHandlingError, Unit] =
    payments
      .cancelPayment(paymentId, error.reason)
      .leftMap(paymentServiceError => ProcessingError(paymentServiceError.message))
      .subflatMap(_ =>
        Left(error match {
          case notAllowed: NotAllowed   => RefusedByRiskManagement(notAllowed.reason)
          case missingData: MissingData => ProcessingError(missingData.reason)
        }))

  private def reportConfirmationToProvider(paymentId: PaymentId): EitherT[Future, NotificationHandlingError, Unit] =
    payments.confirmPayment(paymentId).leftMap(paymentServiceError => ProcessingError(paymentServiceError.message))

  private def confirmDeposit(
      notification: PaymentStateChangedNotification): EitherT[Future, NotificationHandlingError, Unit] = {
    val walletId = WalletId.deriveFrom(notification.punterId)

    wallets
      .deposit(
        walletId,
        notification.amount.map(RealMoney(_)),
        CreditFundsReason.Deposit,
        PaymentMethodAdapter.adapt(notification.paymentMethod))
      .bimap(
        (_: WalletNotFoundError) =>
          ProcessingError(s"Punter wallet does not exist [punterId = ${walletId.owner}, walletId = $walletId]"),
        _ => ())
  }

  private def onCancellation: EitherT[Future, NotificationHandlingError, Unit] =
    EitherT.liftF(Future.unit)

}
