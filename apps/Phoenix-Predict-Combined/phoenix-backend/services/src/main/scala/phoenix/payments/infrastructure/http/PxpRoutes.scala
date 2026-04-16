package phoenix.payments.infrastructure.http

import scala.concurrent.ExecutionContext

import kamon.Kamon
import kamon.context.Context
import org.slf4j.LoggerFactory

import phoenix.http.core.Routes
import phoenix.payments.application.HandlePXPNotification
import phoenix.payments.application.NotificationHandlingError._
import phoenix.payments.application.VerifyPunterForCashDeposit
import phoenix.payments.application.VerifyPunterForCashDeposit._
import phoenix.payments.domain.CashDepositVerificationFailureResponse._
import phoenix.payments.domain.CashDepositVerificationResponse
import phoenix.payments.domain.PaymentStateChangedNotificationResponse._
import phoenix.payments.infrastructure.WebhookCredentials

final class PxpRoutes(
    credentials: WebhookCredentials,
    notificationHandler: HandlePXPNotification,
    verifyPunterForCashDeposit: VerifyPunterForCashDeposit)(implicit ec: ExecutionContext)
    extends Routes {

  private val log = LoggerFactory.getLogger(getClass)

  val PunterID: Context.Key[String] = Context.key[String]("punterID", "undefined")
  val TransactionID: Context.Key[String] = Context.key[String]("transactionID", "undefined")

  val handlePaymentNotifications =
    PxpTapirEndpoints.handlePaymentStateChangedNotification(credentials).serverLogic { _ => notification =>
      Kamon.runWithContext(
        Kamon
          .currentContext()
          .withEntry(PunterID, notification.punterId.value)
          .withEntry(TransactionID, notification.transactionId.value)) {
        log.info("Received notification {}", notification)
        notificationHandler
          .handle(notification)
          .fold(
            {
              case RefusedByRiskManagement(_) => refusedByRiskManagement
              case BlockedByMerchant(_)       => blockedByMerchant
              case ProcessingError(_)         => errorProcessingEvent
              case UnknownState(_)            => unknownState
            },
            _ => processedSuccessfully)
          .map(Right(_))
      }
    }

  val handleCashDepositVerification =
    PxpTapirEndpoints.handleCashDepositVerification(credentials).serverLogic { _ => request =>
      verifyPunterForCashDeposit
        .verify(request)
        .fold[CashDepositVerificationResponse](
          {
            case PunterNotAllowedToDeposit => userNotAllowedToDeposit
            case UserNotFound              => userNotFound
            case MultipleUsersFound        => multipleUsersFound
            case PunterNotFound            => userNotFound
            case WalletNotFound            => userNotFound
          },
          success => success)
        .map(Right(_))
    }

  override val endpoints: Routes.Endpoints = List(handlePaymentNotifications, handleCashDepositVerification)

}
