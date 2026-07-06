package phoenix.reports.support

import scala.concurrent.ExecutionContext
import scala.concurrent.Future

import phoenix.reports.domain.definition.Fields._
import phoenix.reports.domain.definition.ReportDefinition
import phoenix.reports.domain.definition.ReportDefinition._
import phoenix.reports.domain.model.ReportingPeriod
import phoenix.reports.domain.template.ReportDataProvider
import phoenix.reports.support.SimpleReport.SimpleReportRow

final class SimpleReport(dataProvider: ReportDataProvider[SimpleReportRow])(implicit ec: ExecutionContext)
    extends ReportDefinition {

  override def report(reportingPeriod: ReportingPeriod): Future[Report] = {
    val rows = dataProvider.getData(reportingPeriod)
    rows.map(prepareReport)
  }

  private def prepareReport(data: Seq[SimpleReportRow]): Report =
    Report(
      name = "Simple Report",
      Seq[ReportTable](
        ReportTable(
          index = 0,
          columns =
            Seq(Column(displayName = "Column A"), Column(displayName = "Column B"), Column(displayName = "Column C")),
          data = data)))
}

object SimpleReport {
  final case class SimpleReportRow(
      colA: StringField,
      colB: MoneyField,
      colC: StringField,
      colD: OptionalField[StringField])
      extends RowType
}
