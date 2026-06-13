package phoenix.reports.support

import scala.concurrent.ExecutionContext
import scala.concurrent.Future

import phoenix.reports.domain.definition.Fields._
import phoenix.reports.domain.definition.ReportDefinition
import phoenix.reports.domain.definition.ReportDefinition.RowType
import phoenix.reports.domain.definition.ReportDefinition._
import phoenix.reports.domain.model.ReportingPeriod
import phoenix.reports.domain.template.ReportDataProvider
import phoenix.reports.support.MultiTypesReport.MultiTypesReportRow

final class MultiTypesReport(dataProvider: ReportDataProvider[MultiTypesReportRow])(implicit ec: ExecutionContext)
    extends ReportDefinition {

  override def report(reportingPeriod: ReportingPeriod): Future[Report] = {
    val rows = dataProvider.getData(reportingPeriod)
    rows.map(prepareReport)
  }

  private def prepareReport(data: Seq[MultiTypesReportRow]): Report =
    Report(
      name = "MultiTypes Report",
      Seq[ReportTable](
        ReportTable(
          index = 0,
          columns = Seq(
            Column(displayName = "Date"),
            Column(displayName = "Time"),
            Column(displayName = "Date & Time"),
            Column(displayName = "Patron Id"),
            Column(displayName = "Account Designation (Real or Test)"),
            Column(displayName = "Bet Id"),
            Column(displayName = "Sport Discipline"),
            Column(displayName = "Money")),
          data = data)))
}

object MultiTypesReport {
  final case class MultiTypesReportRow(
      dateField: DateField,
      timeField: TimeField,
      dateTimeField: DateTimeField,
      patronIdField: PatronIdField,
      accountDesignationField: AccountDesignationField,
      betIdField: BetIdField,
      sportDisciplineField: SportDisciplineField,
      moneyField: MoneyField)
      extends RowType
}
