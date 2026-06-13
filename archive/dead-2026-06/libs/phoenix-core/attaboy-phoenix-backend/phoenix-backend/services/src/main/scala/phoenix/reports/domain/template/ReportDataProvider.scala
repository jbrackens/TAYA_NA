package phoenix.reports.domain.template

import scala.concurrent.ExecutionContext
import scala.concurrent.Future

import org.slf4j.LoggerFactory

import phoenix.core.ScalaObjectUtils._
import phoenix.reports.domain.definition.ReportDefinition.RowType
import phoenix.reports.domain.model.ReportingPeriod

trait ReportDataProvider[T <: RowType] {

  private val log = LoggerFactory.getLogger(getClass)
  private val reportName = this.simpleObjectName

  final def getData(reportingPeriod: ReportingPeriod)(implicit ec: ExecutionContext): Future[Seq[T]] = {
    log.info(
      s"Running $reportName report for period: ${reportingPeriod.periodStart.toLocalDateTime} - ${reportingPeriod.periodEnd.toLocalDateTime}")
    provideData(reportingPeriod).andThen {
      case scala.util.Success(rows) => log.info(s"Report $reportName data: found ${rows.size} rows")
      case _                        => log.warn(s"Could not get data for report $reportName")
    }
  }

  protected def provideData(reportingPeriod: ReportingPeriod): Future[Seq[T]]
}
