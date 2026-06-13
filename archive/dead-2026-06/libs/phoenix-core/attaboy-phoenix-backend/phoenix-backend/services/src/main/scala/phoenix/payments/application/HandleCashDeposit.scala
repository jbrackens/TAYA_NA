package phoenix.payments.application

import scala.concurrent.ExecutionContext
import scala.concurrent.Future

import cats.data.EitherT

import phoenix.payments.application.DepositPreconditions.DepositPreconditionsError
import phoenix.payments.application.DepositPreconditions.MissingData
import phoenix.payments.application.DepositPreconditions.NotAllowed
import phoenix.payments.application.NotificationHandlingError.BlockedByMerchant
import phoenix.payments.application.NotificationHandlingError.UnknownState
import phoenix.payments.domain.PaymentStateChangedNotification
import phoenix.payments.domain.StateDefinition._
import phoenix.punters.PuntersBoundedContext
import phoenix.wallets.WalletsBoundedContext
import phoenix.wallets.WalletsBoundedContextProtocol.WalletId
import phoenix.wallets.WalletsBoundedContextProtocol.WalletNotFoundError
import phoenix.wallets.domain.CreditFundsReason
import phoenix.wallets.domain.Funds.RealMoney

private[payments] final class HandleCashDeposit(punters: PuntersBoundedContext, wallets: WalletsBoundedContext)(implicit
    ec: ExecutionContext)
    extends NotificationHandlerSupport {

  private val preconditions = new DepositPreconditions(punters, wallets)

  def handle(notification: PaymentStateChangedNotification): EitherT[Future, NotificationHandlingError, Unit] =
    notification.stateDefinition match {
      case Created         => validateDeposit(notification)
      case DepositedByUser => confirmDeposit(notification)
      case AuthorisedByProvider | PendingToBeCaptured | Cancelled | WithdrawnByProvider | RefusedByProvider |
          ToBeWithdrawn | WithdrawnToUser | Expired =>
        ignoreNotification(notification)
    }

  private def validateDeposit(
      notification: PaymentStateChangedNotification): EitherT[Future, NotificationHandlingError, Unit] =
    preconditions
      .assertPunterCanDepositAmountWithCash(notification.punterId, notification.amount.value.moneyAmount)
      .leftMap(toNotificationHandlingError)
      .map(_ => ())

  private def toNotificationHandlingError(error: DepositPreconditionsError): NotificationHandlingError =
    error match {
      case notAllowed: NotAllowed   => BlockedByMerchant(notAllowed.reason)
      case missingData: MissingData => UnknownState(missingData.reason)
    }

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
          UnknownState(s"Punter wallet does not exist [punterId = ${walletId.owner}, walletId = $walletId]"),
        _ => ())
  }
}
