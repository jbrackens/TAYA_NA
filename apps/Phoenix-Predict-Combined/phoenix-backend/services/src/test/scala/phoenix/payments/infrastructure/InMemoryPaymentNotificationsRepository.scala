package phoenix.payments.infrastructure

import scala.concurrent.ExecutionContext
import scala.concurrent.Future

import cats.data.EitherT
import cats.data.OptionT

import phoenix.core.EitherTUtils._
import phoenix.payments.domain.NotificationAlreadyExists
import phoenix.payments.domain.NotificationIdentifier
import phoenix.payments.domain.NotificationNotFound
import phoenix.payments.domain.NotificationProcessingStatus
import phoenix.payments.domain.NotificationProcessingStatus.ProcessingInProgress
import phoenix.payments.domain.PaymentNotificationsRepository
import phoenix.payments.domain.PaymentStateChangedNotification

final class InMemoryPaymentNotificationsRepository(implicit ec: ExecutionContext)
    extends PaymentNotificationsRepository {
  private var notifications
      : Map[NotificationIdentifier, (PaymentStateChangedNotification, NotificationProcessingStatus)] = Map.empty

  override def startProcessing(
      notification: PaymentStateChangedNotification): EitherT[Future, NotificationAlreadyExists, Unit] =
    find(notification.uniqueIdentifier).biflatMap(
      (_: NotificationNotFound) =>
        EitherT.safeRightT {
          notifications = notifications + (notification.uniqueIdentifier -> (notification -> ProcessingInProgress))
        },
      { case (_, status) => EitherT.leftT(NotificationAlreadyExists(notification.uniqueIdentifier, status)) })

  override def updateProcessingStatus(
      id: NotificationIdentifier,
      status: NotificationProcessingStatus): EitherT[Future, NotificationNotFound, Unit] =
    find(id).map { case (notification, _) => notifications = notifications + (id -> (notification -> status)) }

  override def find(id: NotificationIdentifier)
      : EitherT[Future, NotificationNotFound, (PaymentStateChangedNotification, NotificationProcessingStatus)] =
    OptionT.fromOption[Future](notifications.get(id)).toRight(NotificationNotFound(id))
}
