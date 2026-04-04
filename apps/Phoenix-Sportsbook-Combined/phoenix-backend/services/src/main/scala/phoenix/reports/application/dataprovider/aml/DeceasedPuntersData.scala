package phoenix.reports.application.dataprovider.aml
import scala.concurrent.ExecutionContext
import scala.concurrent.Future

import cats.syntax.traverse._
import org.slf4j.LoggerFactory

import phoenix.punters.domain.{PuntersRepository => ApplicationPuntersRepository}
import phoenix.reports.domain.DeceasedPunters.DeceasedPunterInformation
import phoenix.reports.domain.DeceasedPuntersRepository
import phoenix.reports.domain.model.ReportingPeriod
import phoenix.reports.domain.template.ReportDataProvider
import phoenix.reports.domain.template.aml.DeceasedPunters.DeceasedPuntersReportRow

final class DeceasedPuntersData(
    applicationPuntersRepository: ApplicationPuntersRepository,
    deceasedPuntersRepository: DeceasedPuntersRepository)(implicit ec: ExecutionContext)
    extends ReportDataProvider[DeceasedPuntersReportRow] {

  private val log = LoggerFactory.getLogger(getClass)

  override def provideData(reportingPeriod: ReportingPeriod): Future[Seq[DeceasedPuntersReportRow]] = {
    log.info(
      s"Running deceased punters report for period: ${reportingPeriod.periodStart.toLocalDateTime} - ${reportingPeriod.periodEnd.toLocalDateTime}")
    for {
      deceasedPunters <-
        deceasedPuntersRepository.getDeceasedPuntersForPeriod(reportingPeriod.periodStart, reportingPeriod.periodEnd)
      _ = log.info(s"Deceased punters data: found ${deceasedPunters.size} rows")
      rows <- deceasedPunters.flatTraverse(buildRow(_, reportingPeriod))
    } yield rows
  }

  private def buildRow(deceasedPunter: DeceasedPunterInformation, reportingPeriod: ReportingPeriod) = {
    applicationPuntersRepository
      .findByPunterId(deceasedPunter.punterId)
      .map { punter =>
        Seq(DeceasedPuntersReportRow.buildReportRow(punter, deceasedPunter, reportingPeriod))
      }
      .getOrElse(Seq.empty)
  }
}
