package phoenix.reports.application.dataprovider.aml

import scala.concurrent.ExecutionContext
import scala.concurrent.Future

import cats.data.OptionT
import cats.syntax.traverse._

import phoenix.core.validation.ValidationException
import phoenix.punters.domain.{PuntersRepository => ApplicationPuntersRepository}
import phoenix.reports.domain.PunterProfile
import phoenix.reports.domain.PuntersRepository
import phoenix.reports.domain.model.ReportingPeriod
import phoenix.reports.domain.template.ReportDataProvider
import phoenix.reports.domain.template.aml.ManuallyUnsuspendedPunters.ManuallyUnsuspendedPuntersReportRow

final class ManuallyUnsuspendedPuntersData(
    puntersRepository: PuntersRepository,
    applicationPuntersRepository: ApplicationPuntersRepository)(implicit ec: ExecutionContext)
    extends ReportDataProvider[ManuallyUnsuspendedPuntersReportRow] {

  override def provideData(reportingPeriod: ReportingPeriod): Future[Seq[ManuallyUnsuspendedPuntersReportRow]] = {
    for {
      manuallyVerifiedPunters <-
        puntersRepository.getManuallyVerifiedPunters(reportingPeriod.periodStart, reportingPeriod.periodEnd)
      rows <- manuallyVerifiedPunters.traverse(buildRow(reportingPeriod, _))
    } yield rows
  }

  private def buildRow(
      reportingPeriod: ReportingPeriod,
      manuallyVerifiedPunter: PunterProfile): Future[ManuallyUnsuspendedPuntersReportRow] = {
    for {
      registeredAt <- OptionT(applicationPuntersRepository.getRegisteredAt(manuallyVerifiedPunter.punterId)).getOrElseF(
        Future.failed(
          ValidationException(s"Could not find registeredAt for punter ${manuallyVerifiedPunter.punterId.value}")))
      maybeAdmin <- manuallyVerifiedPunter.verifiedBy.flatTraverse(adminId =>
        applicationPuntersRepository.findByPunterId(adminId.toPunterId).value)
    } yield {
      ManuallyUnsuspendedPuntersReportRow.buildReportRow(
        manuallyVerifiedPunter,
        registeredAt,
        maybeAdmin,
        reportingPeriod.periodStart)
    }
  }
}
