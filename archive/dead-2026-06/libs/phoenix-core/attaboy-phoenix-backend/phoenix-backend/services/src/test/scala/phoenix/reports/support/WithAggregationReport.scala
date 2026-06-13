package phoenix.reports.support

import scala.concurrent.ExecutionContext
import scala.concurrent.Future

import phoenix.reports.domain.definition.Fields.MoneyField
import phoenix.reports.domain.definition.Fields.NumberField
import phoenix.reports.domain.definition.Fields.StringField
import phoenix.reports.domain.definition.ReportDefinition
import phoenix.reports.domain.definition.ReportDefinition.AggregationType.Sum
import phoenix.reports.domain.definition.ReportDefinition.RowType
import phoenix.reports.domain.definition.ReportDefinition._
import phoenix.reports.domain.model.ReportingPeriod
import phoenix.reports.domain.template.ReportDataProvider
import phoenix.reports.support.WithAggregationReport.WithAggregationReportRow

final class WithAggregationReport(dataProvider: ReportDataProvider[WithAggregationReportRow])(implicit
    ec: ExecutionContext)
    extends ReportDefinition {

  override def report(reportingPeriod: ReportingPeriod): Future[Report] = {
    val rows = dataProvider.getData(reportingPeriod)
    rows.map(prepareReport)
  }

  private def prepareReport(data: Seq[WithAggregationReportRow]): Report =
    Report(
      name = "WithAggregation Report",
      Seq[ReportTable](
        ReportTable(
          index = 0,
          columns = Seq(
            HeadingColumn(displayName = "Heading should keep 'Totals' label"),
            Column(displayName = "Not MoneyField should not use aggregate"),
            Column(displayName = "MoneyField without aggregate is skipped"),
            Column(displayName = "MoneyField with aggregate calculate sum", aggregation = Sum)),
          data = data)))
}

object WithAggregationReport {
  final case class WithAggregationReportRow(
      heading: StringField,
      notMoney: NumberField,
      moneyNoAggregate: MoneyField,
      moneyWithAggregate: MoneyField)
      extends RowType
}
