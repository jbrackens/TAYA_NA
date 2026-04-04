package phoenix.reports.application

import scala.concurrent.ExecutionContext
import scala.concurrent.Future

import phoenix.core.Clock
import phoenix.core.scheduler.ScheduledJob
import phoenix.punters.domain.{PuntersRepository => ApplicationPuntersRepository}
import phoenix.reports.application.dataprovider.aml.ManuallyUnsuspendedPuntersData
import phoenix.reports.application.generator.ReportGenerator
import phoenix.reports.domain.PuntersRepository
import phoenix.reports.domain.model.ReportingPeriod
import phoenix.reports.domain.template.aml.ManuallyUnsuspendedPunters

private[reports] final class ManuallyUnsuspendedPuntersReportExecutor(
    delivery: ReportDelivery,
    reportGenerator: ReportGenerator,
    puntersRepository: PuntersRepository,
    applicationPuntersRepository: ApplicationPuntersRepository,
    clock: Clock)(implicit ec: ExecutionContext)
    extends ScheduledJob[Unit] {
  val report = new ManuallyUnsuspendedPunters(
    new ManuallyUnsuspendedPuntersData(puntersRepository, applicationPuntersRepository))

  override def execute()(implicit ec: ExecutionContext): Future[Unit] = {
    val reportingPeriod: ReportingPeriod = ReportingPeriod.previousWeek(clock)
    for {
      sheet <- reportGenerator.generate(reportingPeriod, report, clock)
      _ <- delivery.transferReport(reportingPeriod, sheet)
    } yield ()
  }
}
