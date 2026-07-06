package phoenix.reports.application.dataprovider.dge19

import java.time.OffsetDateTime
import java.time.temporal.ChronoUnit

import scala.concurrent.ExecutionContext
import scala.concurrent.Future

import akka.stream.Materializer
import akka.stream.scaladsl.Sink

import phoenix.reports.application.PuntersFinder
import phoenix.reports.application.TransactionFinder
import phoenix.reports.domain.WalletTransaction
import phoenix.reports.domain.definition.Fields._
import phoenix.reports.domain.model.ReportingPeriod
import phoenix.reports.domain.template.ReportDataProvider
import phoenix.reports.domain.template.dge19.PendingTransactionDepositsWithdrawals.PendingTransactionDepositsWithdrawalsRow

final class PendingTransactionDepositsWithdrawalsData(
    transactionFinder: TransactionFinder,
    puntersFinder: PuntersFinder)(implicit mat: Materializer, ec: ExecutionContext)
    extends ReportDataProvider[PendingTransactionDepositsWithdrawalsRow] {
  override def provideData(reportingPeriod: ReportingPeriod): Future[Seq[PendingTransactionDepositsWithdrawalsRow]] = {
    transactionFinder
      .findPendingAsOf(reportingPeriod.periodEnd)
      .mapAsync(10)(transaction => buildReportRow(reportingPeriod, transaction))
      .runWith(Sink.collection)
  }

  private def buildReportRow(
      reportingPeriod: ReportingPeriod,
      transaction: WalletTransaction): Future[PendingTransactionDepositsWithdrawalsRow] =
    puntersFinder.find(transaction.punterId).map { punterProfile =>
      PendingTransactionDepositsWithdrawalsRow(
        gamingDate = DateField(reportingPeriod.periodStart),
        patronId = PatronIdField(transaction.punterId),
        accountDesignation = AccountDesignationField(punterProfile.designation()),
        transactionDateTime = DateTimeField(transaction.startedAt),
        transactionType = TransactionTypeField(transaction.transactionType),
        transactionAmount = MoneyField(transaction.amount.amount),
        daysOutstanding = NumberField(daysOutstanding(transaction.startedAt, reportingPeriod)))
    }

  /**
   * Calculates how many full days (24h) from periodEnd elapsed.
   * ReportingPeriod is eg Day(2021-02-20T00:00Z,2021-02-21T00:00Z) - right side is exclusive so we cannot use it for calculation,
   * otherwise `periodStart` would result in 1 day outstanding what is not correct, that's why we subtract 1nanos
   */
  private def daysOutstanding(from: OffsetDateTime, reportingPeriod: ReportingPeriod): Int = {
    ChronoUnit.DAYS.between(from, reportingPeriod.periodEnd.minusNanos(1)).intValue()
  }
}
