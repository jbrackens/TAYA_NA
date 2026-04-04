package phoenix.reports.application

import scala.concurrent.ExecutionContext
import scala.concurrent.Future

import com.norbitltd.spoiwo.model.Sheet

import phoenix.reports.domain.model.ReportingPeriod

private[reports] trait ReportDelivery {
  def transferReport(reportingPeriod: ReportingPeriod, report: Sheet)(implicit ec: ExecutionContext): Future[Unit]
}
