package stella.wallet.db.transaction

import java.time.OffsetDateTime

import scala.concurrent.ExecutionContext
import scala.concurrent.Future

import pl.iterators.kebs.tagged.slick.SlickSupport
import slick.basic.DatabaseConfig
import slick.jdbc.JdbcProfile

import stella.common.core.Clock
import stella.common.core.OffsetDateTimeUtils
import stella.common.models.Ids._

import stella.wallet.db.CommonMappers
import stella.wallet.db.ExtendedPostgresProfile.api._
import stella.wallet.models.Ids._
import stella.wallet.models.transaction
import stella.wallet.models.transaction.Transaction
import stella.wallet.models.transaction.TransactionEntity
import stella.wallet.models.transaction.TransactionType
import stella.wallet.models.wallet.PositiveBigDecimal

class SlickTransactionReadRepository(dbConfig: TransactionReadDbConfig)
    extends TransactionReadRepository
    with CommonMappers
    with SlickSupport {

  import SlickTransactionRepository._
  import dbConfig.config._

  override def getTransactionHistory(
      walletOwnerId: UserId,
      currencyId: CurrencyId,
      transactionTypes: Set[TransactionType],
      dateRangeStart: Option[OffsetDateTime],
      dateRangeEnd: Option[OffsetDateTime],
      sortFromNewestToOldest: Boolean)(implicit ec: ExecutionContext): Future[Seq[TransactionEntity]] =
    db.run {
      transactionTable
        .filter(_.walletOwnerId === walletOwnerId)
        .filter(entity => entity.currencyId === currencyId || entity.exchangeToCurrencyId === currencyId)
        .filterIf(transactionTypes.nonEmpty)(_.transactionType.inSet(transactionTypes))
        .filterOpt(dateRangeStart)((entity, startDate) => entity.transactionDate >= startDate)
        .filterOpt(dateRangeEnd)((entity, endDate) => entity.transactionDate <= endDate)
        .sortBy(entity =>
          if (sortFromNewestToOldest) (entity.transactionDate.desc, entity.id.desc)
          else (entity.transactionDate.asc, entity.id.asc))
        .result
    }
}

class SlickTransactionWriteRepository(dbConfig: DatabaseConfig[JdbcProfile], clock: Clock)
    extends TransactionWriteRepository
    with CommonMappers
    with SlickSupport {

  import SlickTransactionRepository._
  import dbConfig._

  def persist(transaction: Transaction)(implicit ec: ExecutionContext): Future[Unit] =
    db.run {
      val currentDateTime = clock.currentUtcOffsetDateTime()
      (transactionTable
        .returning(transactionTable.map(_.id))
        .into((te: TransactionEntity, id: TransactionId) => te.copy(id = id)) += TransactionEntity.fromTransaction(
        transaction,
        TransactionId(0),
        currentDateTime)).map(_ => ())
    }
}

object SlickTransactionRepository extends CommonMappers with SlickSupport {

  type TransactionTableRow = (
      TransactionId,
      TransactionType,
      CurrencyId,
      BigDecimal,
      Option[CurrencyId],
      Option[PositiveBigDecimal],
      ProjectId,
      UserId,
      UserId,
      Option[String],
      Option[String],
      OffsetDateTime,
      OffsetDateTime)

  private[transaction] class TransactionTable(tag: Tag) extends Table[TransactionEntity](tag, "wallet_transactions") {
    def id = column[TransactionId]("id", O.PrimaryKey, O.AutoInc)
    def transactionType = column[TransactionType]("transaction_type")
    def currencyId = column[CurrencyId]("currency_id")
    def amount = column[BigDecimal]("amount")
    def exchangeToCurrencyId = column[Option[CurrencyId]]("exchange_to_currency_id")
    def exchangeRate = column[Option[PositiveBigDecimal]]("exchange_rate")
    def projectId = column[ProjectId]("project_id")
    def walletOwnerId = column[UserId]("wallet_owner_id")
    def requesterId = column[UserId]("requester_id")
    def externalTransactionId = column[Option[String]]("external_transaction_id")
    def title = column[Option[String]]("title")
    def transactionDate = column[OffsetDateTime]("transaction_date")
    def createdAt = column[OffsetDateTime]("created_at")

    def * =
      (
        id,
        transactionType,
        currencyId,
        amount,
        exchangeToCurrencyId,
        exchangeRate,
        projectId,
        walletOwnerId,
        requesterId,
        externalTransactionId,
        title,
        transactionDate,
        createdAt).<>(fromTransactionTableRow, TransactionEntity.unapply)

    private def fromTransactionTableRow(row: TransactionTableRow): TransactionEntity = row match {
      case (
            id,
            transactionType,
            currencyId,
            amount,
            exchangeToCurrencyId,
            exchangeRate,
            projectId,
            walletOwnerId,
            requesterId,
            externalTransactionId,
            title,
            transactionDate,
            createdAt) =>
        transaction.TransactionEntity(
          id,
          transactionType,
          currencyId,
          amount,
          exchangeToCurrencyId,
          exchangeRate,
          projectId,
          walletOwnerId,
          requesterId,
          externalTransactionId,
          title,
          OffsetDateTimeUtils.asUtc(transactionDate),
          OffsetDateTimeUtils.asUtc(createdAt))
    }
  }

  private[transaction] val transactionTable = TableQuery[TransactionTable]
}
