package phoenix.reports.application.dataprovider.aml

import scala.concurrent.ExecutionContext
import scala.concurrent.Future

import cats.syntax.traverse._

import phoenix.punters.domain.PunterDeviceFingerprint
import phoenix.punters.domain.PunterDeviceFingerprintsRepository
import phoenix.reports.application.PuntersFinder
import phoenix.reports.domain.model.ReportingPeriod
import phoenix.reports.domain.template.ReportDataProvider
import phoenix.reports.domain.template.aml.MultiDeviceActivity.MultiDeviceActivityRow

final class MultiDeviceActivityData(
    puntersFinder: PuntersFinder,
    punterDeviceFingerprintsRepository: PunterDeviceFingerprintsRepository)(implicit ec: ExecutionContext)
    extends ReportDataProvider[MultiDeviceActivityRow] {

  private def getFingerprintsWithMultipleOccurrences(
      fingerprints: Seq[PunterDeviceFingerprint],
      occurrences: Int): Seq[PunterDeviceFingerprint] =
    fingerprints
      .groupBy(_.punterId)
      .map { case (punterId, group) => (punterId, group.length) }
      .filter { case (_, count) => count >= occurrences }
      .flatMap { case (id, _) => fingerprints.filter(_.punterId == id) }
      .toSeq

  override def provideData(reportingPeriod: ReportingPeriod): Future[Seq[MultiDeviceActivityRow]] =
    for {
      allPunterDeviceFingerprints <-
        punterDeviceFingerprintsRepository
          .findPunterDeviceFingerprints(reportingPeriod.periodStart, reportingPeriod.periodEnd)
          .map { getFingerprintsWithMultipleOccurrences(_, 3) }
      rows <-
        allPunterDeviceFingerprints
          .sortBy(_.punterId.value)
          .traverse(punterDeviceFingerprint => buildRow(reportingPeriod, punterDeviceFingerprint))
    } yield rows

  private def buildRow(
      reportingPeriod: ReportingPeriod,
      punterDeviceFingerprint: PunterDeviceFingerprint): Future[MultiDeviceActivityRow] = {
    for {
      punterProfile <- puntersFinder.find(punterDeviceFingerprint.punterId)
    } yield {
      MultiDeviceActivityRow.buildReportRow(
        periodStart = reportingPeriod.periodStart,
        punterProfile = punterProfile,
        deviceFingerprint = punterDeviceFingerprint)
    }
  }

}
