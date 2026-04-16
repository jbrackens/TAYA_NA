package phoenix.wallets

import java.time.OffsetDateTime

import scala.concurrent.ExecutionContext
import scala.concurrent.Future

import akka.NotUsed
import akka.stream.scaladsl.Source
import slick.basic.DatabaseConfig
import slick.jdbc.JdbcProfile
import slick.lifted.ProvenShape

import phoenix.bets.BetEntity.BetId
import phoenix.core.currency.DefaultCurrencyMoney
import phoenix.core.pagination.PaginatedResult
import phoenix.core.pagination.Pagination
import phoenix.core.persistence.DBUtils
import phoenix.core.persistence.ExtendedPostgresProfile.api._
import phoenix.projections.DomainMappers._
import phoenix.wallets.SlickWalletTransactionsRepository.WalletTransactionsTable
import phoenix.wallets.WalletsBoundedContextProtocol.TransactionReason
import phoenix.wallets.WalletsBoundedContextProtocol.TransactionReason.FundsDeposited
import phoenix.wallets.WalletsBoundedContextProtocol.TransactionReason.FundsWithdrawn
import phoenix.wallets.WalletsBoundedContextProtocol.TransactionReason.WithdrawalConfirmed
import phoenix.wallets.WalletsBoundedContextProtocol.WalletId
import phoenix.wallets.WalletsBoundedContextProtocol.WalletTransactionsQuery
import phoenix.wallets.domain.Funds.RealMoney
import phoenix.wallets.domain.PaymentMethod
import phoenix.wallets.domain.PaymentMethod._

trait WalletTransactionsRepository {
  def save(transaction: WalletTransaction)(implicit ec: ExecutionContext): Future[Unit]
  def findPaginated(query: WalletTransactionsQuery, pagination: Pagination)(implicit
      ec: ExecutionContext): Future[PaginatedResult[WalletTransaction]]
  def findAll(query: WalletTransactionsQuery)(implicit ec: ExecutionContext): Source[WalletTransaction, NotUsed]
  def getLifetimeWithdrawals(walletId: WalletId)(implicit ec: ExecutionContext): Future[RealMoney]
  def getLifetimeDeposits(walletId: WalletId)(implicit ec: ExecutionContext): Future[RealMoney]
}

class SlickWalletTransactionsRepository(dbConfig: DatabaseConfig[JdbcProfile]) extends WalletTransactionsRepository {
  import dbConfig.db

  private[wallets] val transactionsQuery: TableQuery[WalletTransactionsTable] = TableQuery[WalletTransactionsTable]

  override def save(transaction: WalletTransaction)(implicit ec: ExecutionContext): Future[Unit] =
    db.run(transactionsQuery += WalletTransactionRow(transaction)).map(_ => ())

  override def findPaginated(query: WalletTransactionsQuery, pagination: Pagination)(implicit
      ec: ExecutionContext): Future[PaginatedResult[WalletTransaction]] = {

    val latestTransactionsQuery = transactionsQuery.filter(_.walletId === query.walletId).groupBy(_.transactionId).map {
      case (id, group) => (id, group.map(_.createdAt).max)
    }

    val queryWithFilters = queryFromFilters(query)
      .join(latestTransactionsQuery)
      .on((transactions, latest) => transactions.transactionId === latest._1 && transactions.createdAt === latest._2)
      .map { case (transactions, _) => transactions }

    val dbio = for {
      transactions <-
        queryWithFilters
          .sortBy(_.createdAt.desc)
          .drop(pagination.offset)
          .take(pagination.itemsPerPage)
          .result
          .map(_.map(_.walletTransaction))
      transactionsCount <- queryWithFilters.length.result
    } yield PaginatedResult(transactions, transactionsCount, pagination)

    db.run(dbio)
  }

  override def findAll(query: WalletTransactionsQuery)(implicit
      ec: ExecutionContext): Source[WalletTransaction, NotUsed] = {
    val dbio = queryFromFilters(query).sortBy(_.createdAt.desc).result
    DBUtils.streamingSource(db, dbio, fetchSize = 1000).map(_.walletTransaction)
  }

  def getLifetimeWithdrawals(walletId: WalletId)(implicit ec: ExecutionContext): Future[RealMoney] = {
    getLifetimeTransactions(walletId, WithdrawalConfirmed, FundsWithdrawn)
  }

  def getLifetimeDeposits(walletId: WalletId)(implicit ec: ExecutionContext): Future[RealMoney] = {
    getLifetimeTransactions(walletId, FundsDeposited)
  }

  private def queryFromFilters(query: WalletTransactionsQuery) =
    transactionsQuery
      .filter(_.walletId === query.walletId)
      .filter(_.reason.inSetBind(query.categories.flatMap(TransactionCategory.correspondingReasonsFor)))
      .filter(_.reason.inSetBind(query.products.flatMap(WalletProduct.correspondingReasonsFor)))
      .filter(wt => wt.createdAt >= query.timeRange.start && wt.createdAt <= query.timeRange.end)

  private def getLifetimeTransactions(walletId: WalletId, transactionReason: TransactionReason*)(implicit
      ec: ExecutionContext) = {
    val dbio =
      transactionsQuery
        .filter(_.walletId === walletId)
        .filter(_.reason.inSetBind(transactionReason))
        .filterNot(_.paymentMethod === (NotApplicablePaymentMethod: PaymentMethod))
        .map(_.amount)
        .result
    db.run(dbio).map(_.foldLeft(DefaultCurrencyMoney(0))(_ + _)).map(RealMoney(_))
  }
}

private[wallets] final case class WalletTransactionRow(
    walletTransaction: WalletTransaction,
    lineId: Option[Long] = None)

object SlickWalletTransactionsRepository {
  private[wallets] class WalletTransactionsTable(tag: Tag)
      extends Table[WalletTransactionRow](tag, "wallet_transactions") {
    type TableRow = (
        Option[String],
        String,
        WalletId,
        TransactionReason,
        DefaultCurrencyMoney,
        OffsetDateTime,
        DefaultCurrencyMoney,
        DefaultCurrencyMoney,
        Option[BetId],
        Option[String],
        Option[PaymentMethod],
        Option[Long])

    def lineId: Rep[Long] = column[Long]("line_id", O.PrimaryKey, O.AutoInc)
    def reservationId: Rep[Option[String]] = column[Option[String]]("reservation_id")
    def transactionId: Rep[String] = column[String]("transaction_id", O.PrimaryKey)
    def walletId: Rep[WalletId] = column[WalletId]("wallet_id")
    def reason: Rep[TransactionReason] = column[TransactionReason]("reason")
    def amount: Rep[DefaultCurrencyMoney] = column[DefaultCurrencyMoney]("amount")
    def createdAt: Rep[OffsetDateTime] = column[OffsetDateTime]("created_at")
    def preBalance: Rep[DefaultCurrencyMoney] = column[DefaultCurrencyMoney]("pre_balance")
    def postBalance: Rep[DefaultCurrencyMoney] = column[DefaultCurrencyMoney]("post_balance")
    def betId: Rep[Option[BetId]] = column[Option[BetId]]("bet_id")
    def externalId: Rep[Option[String]] = column[Option[String]]("external_id")
    def paymentMethod: Rep[Option[PaymentMethod]] = column[Option[PaymentMethod]]("payment_method")

    override def * : ProvenShape[WalletTransactionRow] =
      (
        reservationId,
        transactionId,
        walletId,
        reason,
        amount,
        createdAt,
        preBalance,
        postBalance,
        betId,
        externalId,
        paymentMethod,
        lineId.?) <> (fromTableRow, toTableRow)

    private def toTableRow(row: WalletTransactionRow): Option[TableRow] = {
      Some(
        (
          row.walletTransaction.reservationId,
          row.walletTransaction.transactionId,
          row.walletTransaction.walletId,
          row.walletTransaction.reason,
          row.walletTransaction.transactionAmount,
          row.walletTransaction.createdAt,
          row.walletTransaction.preTransactionBalance,
          row.walletTransaction.postTransactionBalance,
          row.walletTransaction.betId,
          row.walletTransaction.externalId,
          row.walletTransaction.paymentMethod,
          row.lineId))
    }

    private def fromTableRow(row: TableRow): WalletTransactionRow =
      row match {
        case (
              reservationId,
              transactionId,
              walletId,
              reason,
              transactionAmount,
              createdAt,
              preTransactionBalance,
              postTransactionBalance,
              betId,
              externalId,
              paymentMethod,
              lineId) =>
          WalletTransactionRow(
            WalletTransaction(
              reservationId,
              transactionId,
              walletId,
              reason,
              transactionAmount,
              createdAt,
              preTransactionBalance,
              postTransactionBalance,
              betId,
              externalId,
              paymentMethod),
            lineId)
      }
  }

}
