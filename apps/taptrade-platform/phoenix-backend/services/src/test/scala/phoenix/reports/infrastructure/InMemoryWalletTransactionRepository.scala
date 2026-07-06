package phoenix.reports.infrastructure

import java.time.OffsetDateTime

import scala.concurrent.Future

import akka.NotUsed
import akka.stream.scaladsl.Source

import phoenix.core.SeqUtils._
import phoenix.reports.domain.WalletTransaction
import phoenix.reports.domain.WalletTransactionRepository
import phoenix.wallets.WalletsBoundedContextProtocol.TransactionId
import phoenix.wallets.WalletsBoundedContextProtocol.TransactionReason

final class InMemoryWalletTransactionRepository(private var transactions: List[WalletTransaction] = List.empty)
    extends WalletTransactionRepository {
  override def upsert(transaction: WalletTransaction): Future[Unit] =
    Future.successful {
      replace(transaction)
    }

  override def setClosedAt(transactionId: TransactionId, closedAt: OffsetDateTime): Future[Unit] = {
    Future.successful {
      transactions.find(_.transactionId == transactionId) match {
        case Some(openBet) => replace(openBet.copy(closedAt = Some(closedAt)))
        case None          => ()
      }
    }
  }

  private def replace(transaction: WalletTransaction): Unit = {
    transactions = transactions.filter(_.transactionId != transaction.transactionId) :+ transaction
  }

  override def findPendingAsOf(reference: OffsetDateTime): Source[WalletTransaction, NotUsed] = {
    def wasOpenedAt(startedAt: OffsetDateTime, maybeClosedAt: Option[OffsetDateTime]) =
      !startedAt.isAfter(reference) && maybeClosedAt.forall(_.isAfter(reference))

    val pendingTransactions =
      transactions.filter(transaction => wasOpenedAt(transaction.startedAt, transaction.closedAt))

    Source(pendingTransactions.sortBy(_.startedAt))
  }

  override def findAdjustmentsAsOf(
      startDate: OffsetDateTime,
      endDate: OffsetDateTime): Source[WalletTransaction, NotUsed] = {
    val adjustingEvents: Seq[TransactionReason.PaymentReason] =
      Seq(TransactionReason.AdjustingFundsDeposited, TransactionReason.AdjustingFundsWithdrawn)
    val adjustingTransactions =
      transactions.filter(
        transaction =>
          (transaction.startedAt.isAfter(startDate) && transaction.startedAt.isBefore(endDate)) && adjustingEvents
            .invariantContains(transaction.transactionReason.asInstanceOf[TransactionReason.PaymentReason]))

    Source(adjustingTransactions.sortBy(_.startedAt))
  }

  // TODO (PHXD-3218): remove after release of PHXD-3115
  override def setTransactionReason(
      transactionId: TransactionId,
      transactionReason: TransactionReason): Future[Unit] = {
    Future.successful {
      transactions.find(_.transactionId == transactionId).foreach { transaction =>
        replace(transaction.copy(transactionReason = transactionReason))
      }
    }
  }
}
