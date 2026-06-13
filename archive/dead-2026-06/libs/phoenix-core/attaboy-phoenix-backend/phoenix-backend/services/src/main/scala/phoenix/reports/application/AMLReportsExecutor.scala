package phoenix.reports.application

import scala.concurrent.ExecutionContext
import scala.concurrent.Future

import akka.stream.Materializer

import phoenix.core.Clock
import phoenix.core.scheduler.ScheduledJob
import phoenix.reports.application.PuntersFinder
import phoenix.reports.application.dataprovider.aml.DepositingAccountsData
import phoenix.reports.application.generator.ReportGenerator
import phoenix.reports.domain.WalletSummaryRepository
import phoenix.reports.domain.model.ReportingPeriod
import phoenix.reports.domain.template.aml.DepositingAccounts

private[reports] final class AMLReportsExecutor(
    delivery: ReportDelivery,
    reportGenerator: ReportGenerator,
    puntersFinder: PuntersFinder,
    walletSummaries: WalletSummaryRepository,
    withinPeriod: Clock => ReportingPeriod,
    clock: Clock)(implicit mat: Materializer, ec: ExecutionContext)
    extends ScheduledJob[Unit] {
  val report = new DepositingAccounts(new DepositingAccountsData(puntersFinder, walletSummaries))

  override def execute()(implicit ec: ExecutionContext): Future[Unit] = {
    val reportingPeriod = withinPeriod(clock)
    for {
      sheet <- reportGenerator.generate(reportingPeriod, report, clock)
      _ <- delivery.transferReport(reportingPeriod, sheet)
    } yield ()
  }
}
