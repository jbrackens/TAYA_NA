package phoenix.reports.application

import java.time.OffsetDateTime

import akka.NotUsed
import akka.stream.scaladsl.Source

import phoenix.reports.domain.WalletTransaction
import phoenix.reports.domain.WalletTransactionRepository

final class TransactionFinder(transactionRepository: WalletTransactionRepository) {
  def findPendingAsOf(reference: OffsetDateTime): Source[WalletTransaction, NotUsed] =
    transactionRepository.findPendingAsOf(reference)

  def findAdjustmentsAsOf(startDate: OffsetDateTime, endDate: OffsetDateTime): Source[WalletTransaction, NotUsed] =
    transactionRepository.findAdjustmentsAsOf(startDate, endDate)
}
