package phoenix.reports.application.dataprovider.aml

import scala.concurrent.ExecutionContext
import scala.concurrent.Future

import akka.stream.Materializer
import akka.stream.scaladsl.Sink
import cats.syntax.traverse._

import phoenix.punters.PunterEntity.PunterId
import phoenix.reports.application.PuntersFinder
import phoenix.reports.domain.WalletSummaryRepository
import phoenix.reports.domain.model.ReportingPeriod
import phoenix.reports.domain.model.wallets.PeriodicWalletSummary
import phoenix.reports.domain.template.ReportDataProvider
import phoenix.reports.domain.template.aml.DepositingAccounts.DepositingAccountsReportRow

final class DepositingAccountsData(puntersFinder: PuntersFinder, punterWallets: WalletSummaryRepository)(implicit
    ec: ExecutionContext,
    mat: Materializer)
    extends ReportDataProvider[DepositingAccountsReportRow] {

  override def provideData(reportingPeriod: ReportingPeriod): Future[Seq[DepositingAccountsReportRow]] =
    for {
      periodicSummaries <- punterWallets.getDailyWalletSummaryByPeriod(reportingPeriod).runWith(Sink.seq)
      punterSummaries = PeriodicWalletSummary(periodicSummaries)
      rows <- punterSummaries.traverse(periodicSummary => buildRow(periodicSummary.punterId, periodicSummary))
    } yield rows

  private def buildRow(
      punterId: PunterId,
      periodicSummary: PeriodicWalletSummary): Future[DepositingAccountsReportRow] =
    for {
      punter <- puntersFinder.find(punterId)
      activationPath = punter.activationPath
    } yield DepositingAccountsReportRow.buildReportRow(
      punterId,
      activationPath,
      periodicSummary.deposits,
      periodicSummary.withdrawals,
      periodicSummary.lifetimeDeposits,
      periodicSummary.lifetimeWithdrawals,
      periodicSummary.turnover)
}
