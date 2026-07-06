package phoenix.payments.application

import scala.concurrent.ExecutionContext
import scala.concurrent.Future

import cats.data.EitherT
import org.slf4j.LoggerFactory

import phoenix.core.EitherTUtils._
import phoenix.payments.application.NotificationHandlingError.BlockedByMerchant
import phoenix.payments.application.NotificationHandlingError.ProcessingError
import phoenix.payments.application.NotificationHandlingError.RefusedByRiskManagement
import phoenix.payments.application.NotificationHandlingError.UnknownState
import phoenix.payments.domain.CashWithdrawalReservationsRepository
import phoenix.payments.domain.NotificationProcessingStatus._
import phoenix.payments.domain.PaymentDirection
import phoenix.payments.domain.PaymentMethod
import phoenix.payments.domain.PaymentMethod.CashDeposit
import phoenix.payments.domain.PaymentMethod.CashWithdrawal
import phoenix.payments.domain.PaymentMethod.VisaDeposit
import phoenix.payments.domain.PaymentMethod.VisaWithdrawal
import phoenix.payments.domain.PaymentNotificationsRepository
import phoenix.payments.domain.PaymentStateChangedNotification
import phoenix.payments.domain.PaymentTransaction
import phoenix.payments.domain.PaymentsService
import phoenix.payments.domain.StateDefinition
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
import phoenix.payments.domain.TransactionRepository
import phoenix.payments.domain.TransactionStatus
import phoenix.punters.PuntersBoundedContext
import phoenix.wallets.WalletsBoundedContext

final class HandlePXPNotification(
    punters: PuntersBoundedContext,
    wallets: WalletsBoundedContext,
    payments: PaymentsService,
    transactions: TransactionRepository,
    cashWithdrawalReservationsRepository: CashWithdrawalReservationsRepository,
    notificationsRepository: PaymentNotificationsRepository)(implicit ec: ExecutionContext) {
  private val log = LoggerFactory.getLogger(getClass)

  private val depositHandler = new HandleDeposit(punters, wallets, payments)
  private val withdrawalHandler = new HandleWithdrawal(punters, wallets)
  private val cashWithdrawalHandler = new HandleCashWithdrawal(punters, wallets, cashWithdrawalReservationsRepository)
  private val cashDepositHandler = new HandleCashDeposit(punters, wallets)

  def handle(notification: PaymentStateChangedNotification): EitherT[Future, NotificationHandlingError, Unit] = {
    log.info(s"Handling payment notification [$notification]")
    notificationsRepository
      .startProcessing(notification)
      .biflatMap(
        notificationAlreadyExists => {
          log.info(s"Notification already exists [$notificationAlreadyExists]")
          notificationAlreadyExists.processingStatus match {
            case ProcessingInProgress =>
              EitherT.leftT(ProcessingError("Processing already in progress"))

            case ProcessedSuccessfully =>
              EitherT.unit

            case ProcessedWithError(cause: RefusedByRiskManagement) =>
              EitherT.leftT(cause)

            case ProcessedWithError(cause: BlockedByMerchant) =>
              EitherT.leftT(cause)

            case ProcessedWithError(cause: UnknownState) =>
              EitherT.leftT(cause)

            case ProcessedWithError(_: ProcessingError) =>
              processNotification(notification).biSemiflatMap(
                error => markNotificationProcessingFailed(notification, error),
                _ => markNotificationProcessed(notification))
          }
        },
        _ => {
          log.info("processing notification")
          processNotification(notification).biSemiflatMap(
            error => markNotificationProcessingFailed(notification, error),
            _ => markNotificationProcessed(notification))
        })
  }

  private def processNotification(
      notification: PaymentStateChangedNotification): EitherT[Future, NotificationHandlingError, Unit] = {
    val notificationProcessingResult = notification.paymentMethod match {
      case PaymentMethod.VisaDeposit    => depositHandler.handle(notification)
      case PaymentMethod.VisaWithdrawal => withdrawalHandler.handle(notification)
      case PaymentMethod.CashWithdrawal => cashWithdrawalHandler.handle(notification)
      case PaymentMethod.CashDeposit    => cashDepositHandler.handle(notification)
    }

    notificationProcessingResult.biSemiflatMap(
      error => markTransactionFailed(notification, error),
      _ => markTransactionStateTransition(notification))
  }

  private def markTransactionFailed(
      notification: PaymentStateChangedNotification,
      cause: NotificationHandlingError): Future[NotificationHandlingError] = {
    val transaction = PaymentNotificationConverter.failedTransactionFrom(notification)
    log.info(s"Notification processing: ${transaction.status.entryName}")
    transactions.upsert(transaction).map(_ => cause)
  }

  private def markTransactionStateTransition(notification: PaymentStateChangedNotification): Future[Unit] = {
    val transaction = PaymentNotificationConverter.transactionFrom(notification)
    log.info(s"Notification processing: ${transaction.status.entryName}")
    transactions.upsert(transaction)
  }

  private def markNotificationProcessingFailed(
      notification: PaymentStateChangedNotification,
      cause: NotificationHandlingError): Future[NotificationHandlingError] =
    notificationsRepository
      .updateProcessingStatus(notification.uniqueIdentifier, ProcessedWithError(cause))
      .rethrowT
      .map(_ => cause)

  private def markNotificationProcessed(notification: PaymentStateChangedNotification): Future[Unit] =
    notificationsRepository.updateProcessingStatus(notification.uniqueIdentifier, ProcessedSuccessfully).rethrowT
}

sealed trait NotificationHandlingError
object NotificationHandlingError {
  final case class RefusedByRiskManagement(cause: String) extends NotificationHandlingError
  final case class BlockedByMerchant(cause: String) extends NotificationHandlingError
  final case class ProcessingError(cause: String) extends NotificationHandlingError
  final case class UnknownState(cause: String) extends NotificationHandlingError
}

private object PaymentNotificationConverter {
  def transactionFrom(notification: PaymentStateChangedNotification): PaymentTransaction =
    PaymentTransaction(
      transactionId = notification.transactionId,
      punterId = notification.punterId,
      direction = deriveDirection(notification.paymentMethod),
      amount = notification.amount.value.moneyAmount,
      status = deriveStatus(notification.stateDefinition))

  def failedTransactionFrom(notification: PaymentStateChangedNotification): PaymentTransaction =
    PaymentTransaction(
      transactionId = notification.transactionId,
      punterId = notification.punterId,
      direction = deriveDirection(notification.paymentMethod),
      amount = notification.amount.value.moneyAmount,
      status = TransactionStatus.Failed)

  private def deriveStatus(pxpState: StateDefinition): TransactionStatus =
    pxpState match {
      case AuthorisedByProvider | Created            => TransactionStatus.Pending
      case PendingToBeCaptured | WithdrawnByProvider => TransactionStatus.Succeeded
      case Cancelled | Expired                       => TransactionStatus.Cancelled
      case RefusedByProvider                         => TransactionStatus.Refused
      case ToBeWithdrawn                             => TransactionStatus.Initiated
      case WithdrawnToUser                           => TransactionStatus.Succeeded
      case DepositedByUser                           => TransactionStatus.Succeeded
    }

  private def deriveDirection(pxpPaymentMethod: PaymentMethod): PaymentDirection =
    pxpPaymentMethod match {
      case VisaDeposit | CashDeposit       => PaymentDirection.Deposit
      case VisaWithdrawal | CashWithdrawal => PaymentDirection.Withdrawal
    }
}
