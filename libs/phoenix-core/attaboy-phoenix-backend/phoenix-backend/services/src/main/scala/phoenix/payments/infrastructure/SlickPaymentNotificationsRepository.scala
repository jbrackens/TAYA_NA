package phoenix.payments.infrastructure

import scala.collection.immutable.IndexedSeq
import scala.concurrent.ExecutionContext
import scala.concurrent.Future

import cats.data.EitherT
import cats.data.OptionT
import cats.syntax.applicativeError._
import enumeratum.Enum
import enumeratum.EnumEntry
import enumeratum.EnumEntry.UpperSnakecase
import enumeratum.SlickEnumSupport
import slick.basic.DatabaseConfig
import slick.dbio.Effect
import slick.jdbc.JdbcProfile
import slick.lifted.ProvenShape
import slick.sql.FixedSqlAction

import phoenix.core.currency.DefaultCurrencyMoney
import phoenix.core.currency.MoneyAmount
import phoenix.core.currency.PositiveAmount
import phoenix.core.persistence.ExtendedPostgresProfile
import phoenix.core.persistence.ExtendedPostgresProfile.api._
import phoenix.payments.application.NotificationHandlingError.BlockedByMerchant
import phoenix.payments.application.NotificationHandlingError.ProcessingError
import phoenix.payments.application.NotificationHandlingError.RefusedByRiskManagement
import phoenix.payments.application.NotificationHandlingError.UnknownState
import phoenix.payments.domain.CreationType
import phoenix.payments.domain.NotificationAlreadyExists
import phoenix.payments.domain.NotificationIdentifier
import phoenix.payments.domain.NotificationNotFound
import phoenix.payments.domain.NotificationProcessingStatus
import phoenix.payments.domain.NotificationProcessingStatus.ProcessedSuccessfully
import phoenix.payments.domain.NotificationProcessingStatus.ProcessedWithError
import phoenix.payments.domain.NotificationProcessingStatus.ProcessingInProgress
import phoenix.payments.domain.PaymentId
import phoenix.payments.domain.PaymentMethod
import phoenix.payments.domain.PaymentNotificationsRepository
import phoenix.payments.domain.PaymentStateChangedNotification
import phoenix.payments.domain.StateDefinition
import phoenix.payments.domain.TransactionId
import phoenix.payments.domain.TransactionStatus
import phoenix.payments.infrastructure.SqlActions.getNotificationById
import phoenix.payments.infrastructure.SqlActions.insertNotification
import phoenix.payments.infrastructure.SqlActions.updateNotification
import phoenix.projections.DomainMappers._
import phoenix.punters.PunterEntity.PunterId

final class SlickPaymentNotificationsRepository(dbConfig: DatabaseConfig[JdbcProfile])(implicit ec: ExecutionContext)
    extends PaymentNotificationsRepository {
  import dbConfig.db

  override def startProcessing(
      notification: PaymentStateChangedNotification): EitherT[Future, NotificationAlreadyExists, Unit] = {
    val notificationId = notification.uniqueIdentifier
    val insertStatement = for {
      maybeExistingNotification <- getNotificationById(notification.uniqueIdentifier).result.headOption
      _ <- maybeExistingNotification match {
        case Some((_, status)) => DBIO.failed(NotificationAlreadyExists(notificationId, status))
        case None              => insertNotification(notification, ProcessingInProgress)
      }
    } yield ()

    EitherT {
      db.run(insertStatement.transactionally).attemptNarrow[NotificationAlreadyExists]
    }
  }

  override def updateProcessingStatus(
      id: NotificationIdentifier,
      status: NotificationProcessingStatus): EitherT[Future, NotificationNotFound, Unit] = {
    val updateStatement = for {
      maybeExistingNotification <- getNotificationById(id).forUpdate.result.headOption
      _ <- maybeExistingNotification match {
        case Some((notification, _)) => updateNotification(notification, status)
        case None                    => DBIO.failed(NotificationNotFound(id))
      }
    } yield ()

    EitherT {
      db.run(updateStatement.transactionally).attemptNarrow[NotificationNotFound]
    }
  }

  override def find(id: NotificationIdentifier)
      : EitherT[Future, NotificationNotFound, (PaymentStateChangedNotification, NotificationProcessingStatus)] =
    OptionT(db.run(getNotificationById(id).result.headOption)).toRight(NotificationNotFound(id))
}

private object SqlActions {
  import SlickMappers._
  import phoenix.projections.DomainMappers._

  private val allNotificationsQuery: TableQuery[PaymentStateNotificationTable] =
    TableQuery[PaymentStateNotificationTable]

  def getNotificationById(id: NotificationIdentifier)
      : Query[PaymentStateNotificationTable, (PaymentStateChangedNotification, NotificationProcessingStatus), Seq] =
    filteredById(id).take(1)

  def insertNotification(
      notification: PaymentStateChangedNotification,
      status: NotificationProcessingStatus): FixedSqlAction[Int, NoStream, Effect.Write] =
    allNotificationsQuery += (notification -> status)

  def updateNotification(
      notification: PaymentStateChangedNotification,
      status: NotificationProcessingStatus): FixedSqlAction[Int, NoStream, Effect.Write] =
    filteredById(notification.uniqueIdentifier).update(notification -> status)

  private def filteredById(id: NotificationIdentifier)
      : Query[PaymentStateNotificationTable, (PaymentStateChangedNotification, NotificationProcessingStatus), Seq] =
    allNotificationsQuery.filter(row =>
      row.transactionId === id.transactionId && row.paymentId === id.paymentId && row.stateDefinition === id.stateDefinition)
}

private final class PaymentStateNotificationTable(tag: Tag)
    extends Table[(PaymentStateChangedNotification, NotificationProcessingStatus)](tag, "payment_state_notifications") {

  import SlickMappers._
  import phoenix.projections.DomainMappers._

  type TableRow = (
      (TransactionId, PaymentId, StateDefinition, PunterId, PositiveAmount[MoneyAmount], PaymentMethod, CreationType),
      (ProcessingStatus, Option[String]))

  def transactionId = column[TransactionId]("transaction_id")
  def paymentId = column[PaymentId]("payment_id")
  def stateDefinition = column[StateDefinition]("state_definition")

  def punterId = column[PunterId]("punter_id")
  def transactionAmount = column[PositiveAmount[MoneyAmount]]("transaction_amount")
  def paymentMethod = column[PaymentMethod]("payment_method")
  def creationType = column[CreationType]("creation_type")
  def processingStatus = column[ProcessingStatus]("processing_status")
  def processingDetails = column[Option[String]]("processing_details")

  override def * : ProvenShape[(PaymentStateChangedNotification, NotificationProcessingStatus)] =
    (
      (transactionId, paymentId, stateDefinition, punterId, transactionAmount, paymentMethod, creationType),
      (processingStatus, processingDetails)) <> (fromTableRow, toTableRow)

  private def fromTableRow(row: TableRow): (PaymentStateChangedNotification, NotificationProcessingStatus) =
    row match {
      case (
            (transactionId, paymentId, stateDefinition, punterId, amount, paymentMethod, creationType),
            (processingStatus, processingDetails)) =>
        val notification = PaymentStateChangedNotification(
          punterId,
          transactionId,
          paymentId,
          amount.map(DefaultCurrencyMoney(_)),
          paymentMethod,
          stateDefinition,
          creationType)

        val notificationStatus = processingStatus match {
          case ProcessingStatus.InProgress => ProcessingInProgress
          case ProcessingStatus.Succeeded  => ProcessedSuccessfully
          case ProcessingStatus.Refused    => ProcessedWithError(RefusedByRiskManagement(processingDetails.getOrElse("")))
          case ProcessingStatus.Failed     => ProcessedWithError(ProcessingError(processingDetails.getOrElse("")))
        }

        (notification, notificationStatus)
    }

  private def toTableRow(tuple: (PaymentStateChangedNotification, NotificationProcessingStatus)): Option[TableRow] =
    tuple match {
      case (notification, status) =>
        val notificationProperties = (
          notification.transactionId,
          notification.paymentId,
          notification.stateDefinition,
          notification.punterId,
          notification.amount.map(_.moneyAmount),
          notification.paymentMethod,
          notification.creationType)

        val statusProperties = status match {
          case ProcessingInProgress                                 => (ProcessingStatus.InProgress, None)
          case ProcessedSuccessfully                                => (ProcessingStatus.Succeeded, None)
          case ProcessedWithError(RefusedByRiskManagement(details)) => (ProcessingStatus.Refused, Some(details))
          case ProcessedWithError(BlockedByMerchant(details))       => (ProcessingStatus.Refused, Some(details))
          case ProcessedWithError(UnknownState(details))            => (ProcessingStatus.Refused, Some(details))
          case ProcessedWithError(ProcessingError(details))         => (ProcessingStatus.Failed, Some(details))
        }

        Some((notificationProperties, statusProperties))
    }

  def pk = primaryKey("payment_state_notifications_pk", (transactionId, paymentId, stateDefinition))
}

private sealed trait ProcessingStatus extends EnumEntry with UpperSnakecase
private object ProcessingStatus extends Enum[ProcessingStatus] {
  override def values: IndexedSeq[ProcessingStatus] = findValues

  case object InProgress extends ProcessingStatus
  case object Succeeded extends ProcessingStatus
  case object Refused extends ProcessingStatus
  case object Failed extends ProcessingStatus
}

private object SlickMappers extends SlickEnumSupport {
  override val profile = ExtendedPostgresProfile

  implicit val statusMapper: BaseColumnType[TransactionStatus] = mappedColumnTypeForEnum(TransactionStatus)
  implicit val stateDefinitionMapper: BaseColumnType[StateDefinition] = mappedColumnTypeForEnum(StateDefinition)
  implicit val paymentMethodMapper: BaseColumnType[PaymentMethod] = mappedColumnTypeForEnum(PaymentMethod)
  implicit val creationTypeMapper: BaseColumnType[CreationType] = mappedColumnTypeForEnum(CreationType)
  implicit val processingStatusMapper: BaseColumnType[ProcessingStatus] = mappedColumnTypeForEnum(ProcessingStatus)
  implicit val amountMapper: BaseColumnType[PositiveAmount[MoneyAmount]] =
    MappedColumnType.base[PositiveAmount[MoneyAmount], MoneyAmount](_.value, PositiveAmount.unsafe)
}
