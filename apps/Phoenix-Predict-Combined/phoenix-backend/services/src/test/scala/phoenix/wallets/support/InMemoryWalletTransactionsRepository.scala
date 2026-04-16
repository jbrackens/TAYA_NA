package phoenix.wallets.support

import java.time.OffsetDateTime

import scala.concurrent.ExecutionContext
import scala.concurrent.Future
import scala.math.Ordered.orderingToOrdered

import akka.NotUsed
import akka.stream.scaladsl.Source

import phoenix.core.currency.DefaultCurrencyMoney
import phoenix.core.pagination.PaginatedResult
import phoenix.core.pagination.Pagination
import phoenix.http.routes.EndpointInputs.TimeRange
import phoenix.wallets.TransactionCategory
import phoenix.wallets.TransactionCategory.correspondingReasonsFor
import phoenix.wallets.WalletTransaction
import phoenix.wallets.WalletTransactionsRepository
import phoenix.wallets.WalletsBoundedContextProtocol.TransactionReason
import phoenix.wallets.WalletsBoundedContextProtocol.TransactionReason.FundsDeposited
import phoenix.wallets.WalletsBoundedContextProtocol.TransactionReason.FundsWithdrawn
import phoenix.wallets.WalletsBoundedContextProtocol.TransactionReason.WithdrawalConfirmed
import phoenix.wallets.WalletsBoundedContextProtocol.WalletId
import phoenix.wallets.WalletsBoundedContextProtocol.WalletTransactionsQuery
import phoenix.wallets.domain.Funds.RealMoney
import phoenix.wallets.domain.PaymentMethod.NotApplicablePaymentMethod

final class InMemoryWalletTransactionsRepository(var transactions: List[WalletTransaction] = List.empty)
    extends WalletTransactionsRepository {

  override def save(transaction: WalletTransaction)(implicit ec: ExecutionContext): Future[Unit] =
    Future {
      transactions = transactions.filterNot(_.transactionId == transaction.transactionId) :+ transaction
    }

  override def findPaginated(query: WalletTransactionsQuery, pagination: Pagination)(implicit
      ec: ExecutionContext): Future[PaginatedResult[WalletTransaction]] =
    Future.successful {
      val filteredTransactions =
        transactions
          .filter(_.walletId == query.walletId)
          .filter(byCategories(query.categories))
          .filter(byTimeRange(query.timeRange))
          .sorted(Ordering.by[WalletTransaction, OffsetDateTime](_.createdAt).reverse)

      val requestedPage =
        filteredTransactions.slice(pagination.offset, pagination.offset + pagination.itemsPerPage)

      PaginatedResult(data = requestedPage, totalCount = filteredTransactions.length, paginationRequest = pagination)
    }

  override def findAll(query: WalletTransactionsQuery)(implicit
      ec: ExecutionContext): Source[WalletTransaction, NotUsed] =
    Source(
      transactions
        .filter(_.walletId == query.walletId)
        .filter(byCategories(query.categories))
        .filter(byTimeRange(query.timeRange))
        .sortBy(_.createdAt)
        .reverse)

  override def getLifetimeWithdrawals(walletId: WalletId)(implicit ec: ExecutionContext): Future[RealMoney] =
    getLifetimeTransactions(walletId, WithdrawalConfirmed, FundsWithdrawn)

  override def getLifetimeDeposits(walletId: WalletId)(implicit ec: ExecutionContext): Future[RealMoney] =
    getLifetimeTransactions(walletId, FundsDeposited)

  private def getLifetimeTransactions(walletId: WalletId, transactionReason: TransactionReason*)(implicit
      ec: ExecutionContext) =
    Future
      .successful(
        transactions
          .filter(_.walletId == walletId)
          .filter(x => transactionReason.contains(x.reason))
          .filterNot(_.paymentMethod.exists(_ == NotApplicablePaymentMethod))
          .map(_.transactionAmount)
          .foldRight(DefaultCurrencyMoney(0))(_ + _))
      .map(RealMoney(_))

  private def byCategories(categories: Iterable[TransactionCategory]): WalletTransaction => Boolean = { transaction =>
    val transactionReasons = categories.flatMap(correspondingReasonsFor).toSet
    transactionReasons.contains(transaction.reason)
  }

  private def byTimeRange(timeRange: TimeRange): WalletTransaction => Boolean =
    transaction => transaction.createdAt >= timeRange.start && transaction.createdAt <= timeRange.end
}
