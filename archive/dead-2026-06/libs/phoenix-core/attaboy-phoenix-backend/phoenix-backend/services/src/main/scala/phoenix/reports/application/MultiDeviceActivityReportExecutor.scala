package phoenix.reports.application

import scala.concurrent.ExecutionContext
import scala.concurrent.Future

import phoenix.core.Clock
import phoenix.core.scheduler.ScheduledJob
import phoenix.punters.domain.PunterDeviceFingerprintsRepository
import phoenix.reports.application.dataprovider.aml.MultiDeviceActivityData
import phoenix.reports.application.generator.ReportGenerator
import phoenix.reports.domain.model.ReportingPeriod
import phoenix.reports.domain.template.aml.MultiDeviceActivity

private[reports] final class MultiDeviceActivityReportExecutor(
    delivery: ReportDelivery,
    reportGenerator: ReportGenerator,
    puntersFinder: PuntersFinder,
    punterDeviceFingerprintsRepository: PunterDeviceFingerprintsRepository,
    clock: Clock)(implicit ec: ExecutionContext)
    extends ScheduledJob[Unit] {
  val report = new MultiDeviceActivity(new MultiDeviceActivityData(puntersFinder, punterDeviceFingerprintsRepository))

  override def execute()(implicit ec: ExecutionContext): Future[Unit] = {
    val reportingPeriod: ReportingPeriod = ReportingPeriod.previousDay(clock)
    for {
      sheet <- reportGenerator.generate(reportingPeriod, report, clock)
      _ <- delivery.transferReport(reportingPeriod, sheet)
    } yield ()
  }
}
