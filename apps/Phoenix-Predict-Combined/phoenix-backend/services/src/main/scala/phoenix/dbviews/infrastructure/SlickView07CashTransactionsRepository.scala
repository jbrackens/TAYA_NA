package phoenix.dbviews.infrastructure

import java.time.OffsetDateTime

import scala.concurrent.ExecutionContext
import scala.concurrent.Future

import slick.basic.DatabaseConfig
import slick.jdbc.JdbcProfile
import slick.lifted.ProvenShape
import slick.lifted.TableQuery
import slick.lifted.Tag

import phoenix.core.Clock
import phoenix.core.currency.MoneyAmount
import phoenix.core.persistence.ExtendedPostgresProfile.api._
import phoenix.dbviews.domain.model.CashTransaction
import phoenix.dbviews.domain.model.Constants
import phoenix.dbviews.domain.model.TransactionDescription
import phoenix.dbviews.domain.model.TransactionProvider
import phoenix.dbviews.domain.model.TransactionSource
import phoenix.dbviews.domain.model.TransactionType
import phoenix.punters.PunterEntity

final class SlickView07CashTransactionsRepository(dbConfig: DatabaseConfig[JdbcProfile], easternClock: Clock)(implicit
    ec: ExecutionContext) {
  import dbConfig.db
  import SlickView07CashTransactionsRepository._
  private val cashTransactionQuery: TableQuery[CashTransactionTable] = TableQuery[CashTransactionTable]
  def upsert(cashTransaction: CashTransaction): Future[Unit] =
    db.run(cashTransactionQuery.insertOrUpdate(withEasternTime(cashTransaction, easternClock))).map(_ => ())
}

object SlickView07CashTransactionsRepository {
  import SlickViewMappers._
  final case class CashTransactionWithEasternTime(cashTransaction: CashTransaction, timestamp: OffsetDateTime)
  def withEasternTime(cashTransaction: CashTransaction, easternClock: Clock): CashTransactionWithEasternTime =
    CashTransactionWithEasternTime(
      cashTransaction = cashTransaction,
      timestamp = easternClock.adjustToClockZone(cashTransaction.timestamp))

  final class CashTransactionTable(tag: Tag) extends Table[CashTransactionWithEasternTime](tag, "vNJDGE07CASHTRANS") {
    type TableRow =
      (
          String,
          String,
          String,
          String,
          String,
          TransactionType,
          TransactionDescription,
          BigDecimal,
          BigDecimal,
          Option[TransactionSource],
          Option[TransactionProvider])

    def skinName = column[String]("SKIN_NAME")
    def patronAccountId = column[String]("PATRON_ACCOUNT_ID")
    def cashTransactionId = column[String]("CASH_TRANSACTION_ID")
    def cashTransactionTimeSystem = column[String]("CASH_TRANSACTIONTIME_SYSTEM")
    def cashTransactionTimeEastern = column[String]("CASH_TRANSACTIONTIME_EASTERN")
    def cashTransactionType = column[TransactionType]("CASH_TRANSACTION_TYPE")
    def cashTransactionDescription = column[TransactionDescription]("CASH_TRANSACTION_DESCRIPTION")
    def cashTransactionAmount = column[BigDecimal]("CASH_TRANSACTION_AMOUNT")
    def cashTransactionReqAmount = column[BigDecimal]("CASH_TRANSACTION_REQAMOUNT")
    def cashTransactionSourceType = column[Option[TransactionSource]]("CASH_TRANSACTION_SOURCE_TYPE")
    def cashTransactionProvider = column[Option[TransactionProvider]]("CASH_TRANSACTION_PROVIDER")
    def pk = primaryKey("pk_07", cashTransactionId)
    override def * : ProvenShape[CashTransactionWithEasternTime] =
      (
        skinName,
        patronAccountId,
        cashTransactionId,
        cashTransactionTimeSystem,
        cashTransactionTimeEastern,
        cashTransactionType,
        cashTransactionDescription,
        cashTransactionAmount,
        cashTransactionReqAmount,
        cashTransactionSourceType,
        cashTransactionProvider) <> (fromTableRow, toTableRow)

    private def fromTableRow(row: TableRow): CashTransactionWithEasternTime =
      row match {
        case (
              _,
              patronAccountId,
              transactionId,
              timeSystem,
              timeEastern,
              transactionType,
              description,
              amount,
              requestedAmount,
              sourceType,
              provider) =>
          CashTransactionWithEasternTime(
            cashTransaction = CashTransaction(
              punterId = PunterEntity.PunterId(patronAccountId),
              transactionId = transactionId,
              timestamp = OffsetDateTime.parse(timeSystem, Constants.dateTimePattern),
              transactionType = transactionType,
              description = description,
              amount = MoneyAmount(amount),
              requestedAmount = MoneyAmount(requestedAmount),
              source = sourceType,
              provider = provider),
            timestamp = OffsetDateTime.parse(timeEastern, Constants.dateTimePattern))
      }

    private def toTableRow(transactionWithEasternTime: CashTransactionWithEasternTime): Option[TableRow] = {
      val transaction = transactionWithEasternTime.cashTransaction
      Some(
        (
          Constants.skinName,
          transaction.punterId.value,
          transaction.transactionId,
          transaction.timestamp.format(Constants.dateTimePattern),
          transactionWithEasternTime.timestamp.format(Constants.dateTimePattern),
          transaction.transactionType,
          transaction.description,
          transaction.amount.amount,
          transaction.requestedAmount.amount,
          transaction.source,
          transaction.provider))
    }
  }
}
