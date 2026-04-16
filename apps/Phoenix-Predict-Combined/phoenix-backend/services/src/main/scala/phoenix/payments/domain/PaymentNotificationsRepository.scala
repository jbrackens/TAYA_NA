package phoenix.payments.domain

import scala.concurrent.Future

import cats.data.EitherT

import phoenix.payments.application.NotificationHandlingError

trait PaymentNotificationsRepository {
  def startProcessing(notification: PaymentStateChangedNotification): EitherT[Future, NotificationAlreadyExists, Unit]

  def updateProcessingStatus(
      id: NotificationIdentifier,
      status: NotificationProcessingStatus): EitherT[Future, NotificationNotFound, Unit]

  def find(id: NotificationIdentifier)
      : EitherT[Future, NotificationNotFound, (PaymentStateChangedNotification, NotificationProcessingStatus)]
}

sealed trait NotificationProcessingStatus
object NotificationProcessingStatus {
  case object ProcessingInProgress extends NotificationProcessingStatus
  case object ProcessedSuccessfully extends NotificationProcessingStatus
  final case class ProcessedWithError(error: NotificationHandlingError) extends NotificationProcessingStatus
}

final case class NotificationAlreadyExists(id: NotificationIdentifier, processingStatus: NotificationProcessingStatus)
    extends RuntimeException(s"Payment notification [id = $id] already exists with [status = $processingStatus]")

final case class NotificationNotFound(id: NotificationIdentifier)
    extends RuntimeException(s"Payment notification [id = $id] not found")
