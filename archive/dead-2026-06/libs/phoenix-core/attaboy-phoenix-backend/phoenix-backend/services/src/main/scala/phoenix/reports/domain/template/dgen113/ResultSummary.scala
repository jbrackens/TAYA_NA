package phoenix.reports.domain.template.dgen113

import scala.concurrent.ExecutionContext
import scala.concurrent.Future

import phoenix.reports.domain.definition.Fields.DateField
import phoenix.reports.domain.definition.Fields.MoneyField
import phoenix.reports.domain.definition.Fields.SportDisciplineField
import phoenix.reports.domain.definition.ReportDefinition
import phoenix.reports.domain.definition.ReportDefinition.AggregationType.Sum
import phoenix.reports.domain.definition.ReportDefinition._
import phoenix.reports.domain.model.ReportingPeriod
import phoenix.reports.domain.template.ReportDataProvider
import phoenix.reports.domain.template.dgen113.ResultSummary.ResultSummaryRow

final class ResultSummary(dataProvider: ReportDataProvider[ResultSummaryRow])(implicit ec: ExecutionContext)
    extends ReportDefinition {

  override def report(reportingPeriod: ReportingPeriod): Future[Report] = {
    val rows = dataProvider.getData(reportingPeriod)
    rows.map(prepareReport)
  }

  private def prepareReport(data: Seq[ResultSummaryRow]): Report =
    Report(
      name = "Result Summary Report",
      Seq[ReportTable](
        ReportTable(
          index = 0,
          columns = Seq(
            HeadingColumn(displayName = "Gaming Date"),
            Column(displayName = "Event Type"),
            Column(displayName = "Ticket/Bet sales", aggregation = Sum),
            Column(displayName = "Tickets/Bets paid", aggregation = Sum),
            Column(displayName = "Tickets/Bets cancelled", aggregation = Sum),
            Column(displayName = "Tickets/Bets voided", aggregation = Sum),
            Column(displayName = "Resettled bet adjustment", aggregation = Sum),
            //TODO (PHXD-1445): should we rename to more meaningful "Transaction Impact On Sports Pool Revenue"?
            Column(displayName = "Net Sports Pool Gross Revenue", aggregation = Sum)),
          data = data)))
}

object ResultSummary {

  final case class ResultSummaryRow(
      gamingDate: DateField,
      eventType: SportDisciplineField,
      ticketBetSales: MoneyField,
      ticketsBetsPaid: MoneyField,
      ticketsBetsCancelled: MoneyField,
      ticketsBetsVoided: MoneyField,
      resettledBetAdjustment: MoneyField,
      netSportsPoolGrossRevenue: MoneyField)
      extends RowType
}
