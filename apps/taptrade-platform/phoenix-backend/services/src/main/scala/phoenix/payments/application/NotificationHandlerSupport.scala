package phoenix.payments.application

import scala.concurrent.ExecutionContext
import scala.concurrent.Future

import cats.data.EitherT
import org.slf4j.LoggerFactory

import phoenix.payments.domain.PaymentStateChangedNotification

trait NotificationHandlerSupport {

  private val log = LoggerFactory.getLogger(getClass)

  def ignoreNotification(notification: PaymentStateChangedNotification)(implicit
      ec: ExecutionContext): EitherT[Future, NotificationHandlingError, Unit] = {
    log.warn(s"Received unexpected PXP notification [$notification]")
    EitherT.liftF(Future.unit)
  }
}
