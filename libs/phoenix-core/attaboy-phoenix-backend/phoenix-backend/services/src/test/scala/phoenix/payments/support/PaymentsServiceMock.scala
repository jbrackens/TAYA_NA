package phoenix.payments.support

import scala.concurrent.ExecutionContext
import scala.concurrent.Future

import cats.data.EitherT

import phoenix.core.EitherTUtils._
import phoenix.payments.domain.PaymentId
import phoenix.payments.domain.PaymentOrigin
import phoenix.payments.domain.PaymentSessionStarted
import phoenix.payments.domain.PaymentTransaction
import phoenix.payments.domain.PaymentsService
import phoenix.payments.domain.PaymentsService._
import phoenix.punters.PuntersBoundedContext.SessionId
import phoenix.punters.domain.UserDetails

object PaymentsServiceMock {

  def successful(redirectData: PaymentSessionStarted = PaymentsDataGenerator.generateStartedPaymentSession())(implicit
      ec: ExecutionContext): PaymentsService =
    new PaymentsService {
      override def startPayment(
          origin: PaymentOrigin,
          transaction: PaymentTransaction,
          details: UserDetails): EitherT[Future, PaymentServiceError, PaymentSessionStarted] =
        EitherT.safeRightT(redirectData)

      override def confirmPayment(paymentId: PaymentId): EitherT[Future, PaymentServiceError, Unit] =
        EitherT.safeRightT(())

      override def cancelPayment(paymentId: PaymentId, reason: String): EitherT[Future, PaymentServiceError, Unit] =
        EitherT.safeRightT(())

      override def createCashWithdrawal(
          transaction: PaymentTransaction,
          userDetails: UserDetails,
          sessionId: SessionId): EitherT[Future, PaymentServiceError, Unit] =
        EitherT.safeRightT(())
    }

  def failing()(implicit ec: ExecutionContext): PaymentsService =
    new PaymentsService {
      override def startPayment(
          origin: PaymentOrigin,
          transaction: PaymentTransaction,
          details: UserDetails): EitherT[Future, PaymentServiceError, PaymentSessionStarted] =
        EitherT.leftT(PaymentServiceError("Failed to start payment"))

      override def confirmPayment(paymentId: PaymentId): EitherT[Future, PaymentServiceError, Unit] =
        EitherT.leftT(PaymentServiceError("Failed to confirm payment"))

      override def cancelPayment(paymentId: PaymentId, reason: String): EitherT[Future, PaymentServiceError, Unit] =
        EitherT.leftT(PaymentServiceError("Failed to cancel payment"))

      override def createCashWithdrawal(
          transaction: PaymentTransaction,
          userDetails: UserDetails,
          sessionId: SessionId): EitherT[Future, PaymentServiceError, Unit] =
        EitherT.leftT(PaymentServiceError("Failed to create cash withdrawal"))
    }
}
