package phoenix.payments.domain

import scala.concurrent.Future

import cats.data.EitherT

import phoenix.payments.domain.PaymentsService.PaymentServiceError
import phoenix.punters.PuntersBoundedContext.SessionId
import phoenix.punters.domain.UserDetails
import phoenix.sharding.PhoenixId

trait PaymentsService {
  def startPayment(
      origin: PaymentOrigin,
      transaction: PaymentTransaction,
      details: UserDetails): EitherT[Future, PaymentServiceError, PaymentSessionStarted]

  def confirmPayment(paymentId: PaymentId): EitherT[Future, PaymentServiceError, Unit]

  def cancelPayment(paymentId: PaymentId, reason: String): EitherT[Future, PaymentServiceError, Unit]

  def createCashWithdrawal(
      transaction: PaymentTransaction,
      userDetails: UserDetails,
      sessionId: SessionId): EitherT[Future, PaymentServiceError, Unit]
}

final case class PaymentId(value: String) extends PhoenixId

object PaymentsService {
  final case class PaymentServiceError(message: String, cause: Option[Throwable])
      extends RuntimeException(message, cause.orNull)

  object PaymentServiceError {
    def apply(message: String): PaymentServiceError = PaymentServiceError(message, cause = None)
    def apply(message: String, cause: Throwable): PaymentServiceError =
      PaymentServiceError(message, cause = Some(cause))
  }
}
