package phoenix.reports.infrastructure

import java.time.OffsetDateTime

import scala.concurrent.ExecutionContext
import scala.concurrent.Future

import akka.NotUsed
import akka.stream.scaladsl.Source
import cats.syntax.functor._
import enumeratum.SlickEnumSupport
import slick.basic.DatabaseConfig
import slick.jdbc.JdbcProfile
import slick.lifted.ProvenShape
import slick.lifted.Tag

import phoenix.core.currency.MoneyAmount
import phoenix.core.persistence.DBUtils
import phoenix.core.persistence.ExtendedPostgresProfile
import phoenix.core.persistence.ExtendedPostgresProfile.api._
import phoenix.projections.DomainMappers._
import phoenix.punters.PunterEntity.AdminId
import phoenix.punters.PunterEntity.PunterId
import phoenix.reports.domain.WalletTransaction
import phoenix.reports.domain.WalletTransactionRepository
import phoenix.reports.domain.model.wallets.TransactionType
import phoenix.wallets.WalletsBoundedContextProtocol.TransactionId
import phoenix.wallets.WalletsBoundedContextProtocol.TransactionReason

final class SlickWalletTransactionRepository(dbConfig: DatabaseConfig[JdbcProfile])(implicit ec: ExecutionContext)
    extends WalletTransactionRepository {

  import dbConfig._
  import SlickMappers._

  private val transactions: TableQuery[WalletTransactionTable] = TableQuery[WalletTransactionTable]

  override def upsert(transaction: WalletTransaction): Future[Unit] =
    db.run(transactions.insertOrUpdate(transaction)).void

  override def setClosedAt(transactionId: TransactionId, closedAt: OffsetDateTime): Future[Unit] =
    db.run(transactions.filter(_.transactionId === transactionId).map(_.closedAt).update(Some(closedAt))).void

  override def findPendingAsOf(reference: OffsetDateTime): Source[WalletTransaction, NotUsed] = {
    val pendingTransactionsQuery =
      transactions
        .filter(row => row.startedAt <= reference)
        .filter(row => row.closedAt.isEmpty || row.closedAt > reference)
        .sortBy(row => row.startedAt)

    DBUtils.streamingSource(db, pendingTransactionsQuery.result)
  }

  // TODO (PHXD-3218): remove after release of PHXD-3115
  override def setTransactionReason(
      transactionId: TransactionId,
      transactionReason: TransactionReason): Future[Unit] = {
    db.run {
      transactions.filter(_.transactionId === transactionId).map(_.transactionReason).update(transactionReason)
    }.void
  }

  override def findAdjustmentsAsOf(
      startDate: OffsetDateTime,
      endDate: OffsetDateTime): Source[WalletTransaction, NotUsed] = {
    val adjustingEvents: Seq[TransactionReason] =
      Seq(TransactionReason.AdjustingFundsDeposited, TransactionReason.AdjustingFundsWithdrawn)
    val adjustingTransactionsQuery =
      transactions
        .filter(_.transactionReason.inSetBind(adjustingEvents))
        .filter(row => row.startedAt >= startDate && row.startedAt <= endDate)
        .sortBy(row => row.startedAt)

    DBUtils.streamingSource(db, adjustingTransactionsQuery.result)
  }
}

private final class WalletTransactionTable(tag: Tag)
    extends Table[WalletTransaction](tag, "reporting_wallet_transactions") {
  import SlickMappers._

  val transactionId: Rep[TransactionId] = column[TransactionId]("transaction_id", O.PrimaryKey)
  val punterId: Rep[PunterId] = column[PunterId]("punter_id")
  val amount: Rep[MoneyAmount] = column[MoneyAmount]("amount")
  val transactionType: Rep[TransactionType] = column[TransactionType]("transaction_type")
  val transactionReason: Rep[TransactionReason] = column[TransactionReason]("transaction_reason")
  val startedAt: Rep[OffsetDateTime] = column[OffsetDateTime]("started_at")
  val closedAt: Rep[Option[OffsetDateTime]] = column[Option[OffsetDateTime]]("closed_at")
  val backofficeUserId: Rep[Option[AdminId]] = column[Option[AdminId]]("backoffice_user_id")
  val details: Rep[Option[String]] = column[Option[String]]("details")

  override def * : ProvenShape[WalletTransaction] =
    (
      transactionId,
      punterId,
      amount,
      transactionType,
      transactionReason,
      startedAt,
      closedAt,
      backofficeUserId,
      details).mapTo[WalletTransaction]
}

private object SlickMappers extends SlickEnumSupport {
  override val profile = ExtendedPostgresProfile

  implicit val transactionTypeMapper: BaseColumnType[TransactionType] = mappedColumnTypeForEnum(TransactionType)
  implicit val transactionReasonMapper: BaseColumnType[TransactionReason] = mappedColumnTypeForEnum(TransactionReason)
}
