package phoenix.reports.infrastructure

import java.time.format.DateTimeFormatter
import java.util.UUID

import com.norbitltd.spoiwo.model.Sheet

import phoenix.reports.domain.model.ReportingPeriod

private object ReportNameGenerator {
  private val GENERATION_DATE_FORMATTER = DateTimeFormatter.ofPattern("yyyy-MM-dd")

  def reportName(report: Sheet): String =
    report.name.getOrElse(randomReportName())

  def deriveFileName(report: Sheet, reportingPeriod: ReportingPeriod): String = {
    s"${generationDate(reportingPeriod)}-${reportName(report)}.xlsx"
  }

  private def randomReportName(): String =
    s"report-${UUID.randomUUID().toString}"

  private def generationDate(reportingPeriod: ReportingPeriod): String =
    reportingPeriod.periodStart.format(GENERATION_DATE_FORMATTER)
}
