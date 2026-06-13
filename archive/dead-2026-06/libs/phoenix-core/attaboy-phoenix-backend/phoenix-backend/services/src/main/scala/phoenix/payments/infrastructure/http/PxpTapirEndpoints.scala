package phoenix.payments.infrastructure.http

import sttp.model.StatusCode
import sttp.tapir._
import sttp.tapir.codec.enumeratum.TapirCodecEnumeratum

import phoenix.payments.domain.CashDepositVerificationRequest
import phoenix.payments.domain.CashDepositVerificationResponse
import phoenix.payments.domain.PaymentStateChangedNotification
import phoenix.payments.domain.PaymentStateChangedNotificationResponse
import phoenix.payments.infrastructure.WebhookCredentials
import phoenix.payments.infrastructure.http.CashDepositVerificationXmlFormats._
import phoenix.payments.infrastructure.http.PaymentStateChangeNotificationsXmlFormats._
import phoenix.payments.infrastructure.http.TapirXMLAdapter._

private[payments] object PxpTapirEndpoints extends TapirCodecEnumeratum {

  def handlePaymentStateChangedNotification(credentials: WebhookCredentials) =
    PxpRoutesAuthenticator
      .basicAuth(credentials)
      .post
      // the 'handlePaymentStateChangedNotification' suffix is required by PXP Financial
      .in("pxp" / "payment-state-changed" / "handlePaymentStateChangedNotification")
      .in(xmlBody[PaymentStateChangedNotification])
      .out(xmlBody[PaymentStateChangedNotificationResponse])
      .out(statusCode(StatusCode.Ok))

  def handleCashDepositVerification(credentials: WebhookCredentials) =
    PxpRoutesAuthenticator
      .basicAuth(credentials)
      .post
      .in("pxp" / "verify-cash-deposit")
      .in(xmlBody[CashDepositVerificationRequest])
      .out(xmlBody[CashDepositVerificationResponse])
      .out(statusCode(StatusCode.Ok))

}
