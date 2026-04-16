package phoenix.payments.infrastructure.http

import io.circe.Codec
import io.circe.generic.semiauto.deriveCodec

import phoenix.core.JsonFormats._
import phoenix.core.currency.JsonFormats._
import phoenix.payments.domain.CashWithdrawalIdentifier
import phoenix.payments.domain.PaymentDirection
import phoenix.payments.domain.PaymentReference
import phoenix.payments.domain.PaymentSessionStarted
import phoenix.payments.domain.PaymentTransaction
import phoenix.payments.domain.RedirectToPaymentScreenUrl
import phoenix.payments.domain.TransactionId
import phoenix.payments.domain.TransactionStatus
import phoenix.payments.infrastructure.http.PaymentsTapirEndpoints.ChequeWithdrawalResponse
import phoenix.payments.infrastructure.http.PaymentsTapirEndpoints.PaymentRequest
import phoenix.punters.infrastructure.PunterJsonFormats._

object PaymentsJsonFormats {

  implicit val paymentRequestCodec: Codec[PaymentRequest] = deriveCodec

  implicit val redirectToPaymentScreenUrlCodec: Codec[RedirectToPaymentScreenUrl] =
    Codec[String].bimap(_.value, RedirectToPaymentScreenUrl.apply)
  implicit val paymentReferenceCodec: Codec[PaymentReference] = Codec[String].bimap(_.value, PaymentReference.apply)

  implicit val paymentSessionStartedCodec: Codec[PaymentSessionStarted] = deriveCodec

  private implicit val transactionIdCodec: Codec[TransactionId] = Codec[String].bimap(_.value, TransactionId.apply)
  private implicit val paymentDirectionCodec: Codec[PaymentDirection] = enumCodec(PaymentDirection)
  private implicit val transactionStatusCodec: Codec[TransactionStatus] = enumCodec(TransactionStatus)
  implicit val paymentTransactionCodec: Codec[PaymentTransaction] = deriveCodec
  implicit val cashWithdrawalIdentifierCodec: Codec[CashWithdrawalIdentifier] = deriveCodec
  implicit val chequeWithdrawalResponseCodec: Codec[ChequeWithdrawalResponse] = deriveCodec
}
