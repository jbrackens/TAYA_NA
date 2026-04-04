package phoenix.reports.application
import scala.concurrent.ExecutionContext
import scala.concurrent.Future

import phoenix.core.Clock
import phoenix.core.scheduler.ScheduledJob
import phoenix.punters.domain.{PuntersRepository => ApplicationPuntersRepository}
import phoenix.reports.application.dataprovider.aml.DeceasedPuntersData
import phoenix.reports.application.generator.ReportGenerator
import phoenix.reports.domain.DeceasedPuntersRepository
import phoenix.reports.domain.model.ReportingPeriod
import phoenix.reports.domain.template.aml.DeceasedPunters

private[reports] final class DeceasedPuntersReportExecutor(
    delivery: ReportDelivery,
    reportGenerator: ReportGenerator,
    applicationPuntersRepository: ApplicationPuntersRepository,
    deceasedPuntersRepository: DeceasedPuntersRepository,
    clock: Clock)(implicit ec: ExecutionContext)
    extends ScheduledJob[Unit] {
  val report = new DeceasedPunters(new DeceasedPuntersData(applicationPuntersRepository, deceasedPuntersRepository))

  override def execute()(implicit ec: ExecutionContext): Future[Unit] = {
    val reportingPeriod = ReportingPeriod.previousWeek(clock)
    for {
      sheet <- reportGenerator.generate(reportingPeriod, report, clock)
      _ <- delivery.transferReport(reportingPeriod, sheet)
    } yield ()
  }
}
