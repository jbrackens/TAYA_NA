package phoenix.reports.domain.template.dge19

import scala.concurrent.ExecutionContext
import scala.concurrent.Future

import phoenix.reports.domain.definition.Fields._
import phoenix.reports.domain.definition.ReportDefinition
import phoenix.reports.domain.definition.ReportDefinition.AggregationType.Sum
import phoenix.reports.domain.definition.ReportDefinition._
import phoenix.reports.domain.model.ReportingPeriod
import phoenix.reports.domain.template.ReportDataProvider
import phoenix.reports.domain.template.dge19.PatronAccountAdjustment.PatronAccountAdjustmentRow

final class PatronAccountAdjustment(dataProvider: ReportDataProvider[PatronAccountAdjustmentRow])(implicit
    ec: ExecutionContext)
    extends ReportDefinition {

  override def report(reportingPeriod: ReportingPeriod): Future[Report] = {
    val rows = dataProvider.getData(reportingPeriod)
    rows.map(prepareReport)
  }

  private def prepareReport(data: Seq[PatronAccountAdjustmentRow]): Report =
    Report(
      name = "Patron Account Adjustment Report",
      Seq[ReportTable](
        ReportTable(
          index = 0,
          columns = Seq(
            HeadingColumn(displayName = "Gaming Date"),
            Column(displayName = "Patron Name"),
            Column(displayName = "Patron ID"),
            Column(displayName = "Account Designation (Real or Test)"),
            Column(displayName = "Transaction Time"),
            Column(displayName = "Adjuster Name"),
            Column(displayName = "Adjustment Reason"),
            Column(displayName = "Cashable Amount", aggregation = Sum),
            Column(displayName = "Non-Cashable Amount", aggregation = Sum)),
          data = data)))
}

object PatronAccountAdjustment {

  final case class PatronAccountAdjustmentRow(
      gamingDate: DateField,
      patronName: StringField,
      patronId: PatronIdField,
      accountDesignation: AccountDesignationField,
      transactionTime: TimeField,
      adjusterName: StringField,
      adjustmentReason: StringField,
      cashableAmount: MoneyField,
      nonCashableAmount: MoneyField)
      extends RowType
}
