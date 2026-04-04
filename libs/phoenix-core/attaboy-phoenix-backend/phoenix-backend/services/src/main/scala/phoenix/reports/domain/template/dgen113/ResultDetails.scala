package phoenix.reports.domain.template.dgen113

import scala.concurrent.ExecutionContext
import scala.concurrent.Future

import phoenix.reports.domain.definition.Fields._
import phoenix.reports.domain.definition.ReportDefinition
import phoenix.reports.domain.definition.ReportDefinition.AggregationType.Sum
import phoenix.reports.domain.definition.ReportDefinition._
import phoenix.reports.domain.model.ReportingPeriod
import phoenix.reports.domain.template.ReportDataProvider
import phoenix.reports.domain.template.dgen113.ResultDetails.ResultDetailsRow

final class ResultDetails(dataProvider: ReportDataProvider[ResultDetailsRow])(implicit ec: ExecutionContext)
    extends ReportDefinition {

  override def report(reportingPeriod: ReportingPeriod): Future[Report] = {
    val rows = dataProvider.getData(reportingPeriod)
    rows.map(prepareReport)
  }

  private def prepareReport(data: Seq[ResultDetailsRow]): Report =
    Report(
      name = "Result Details Report",
      Seq[ReportTable](
        ReportTable(
          index = 0,
          columns = Seq(
            HeadingColumn(displayName = "Gaming Date"),
            Column(displayName = "Transaction Time"),
            Column(displayName = "Patron ID"),
            Column(displayName = "Account Designation (Real or Test)"),
            Column(displayName = "Bet ID"),
            Column(displayName = "Event Type"),
            Column(displayName = "Event Name"),
            Column(displayName = "Event Date"),
            Column(displayName = "Wager description"),
            Column(displayName = "Bet Selection"),
            Column(displayName = "Bet Placed Amount", aggregation = Sum),
            Column(displayName = "Bet Paid Amount", aggregation = Sum),
            Column(displayName = "Canceled Bet Amount", aggregation = Sum),
            Column(displayName = "Voided Bet Amount", aggregation = Sum),
            Column(displayName = "Resettled Bet Adjustment", aggregation = Sum),
            Column(displayName = "Transaction Impact On Sports Pool Revenue", aggregation = Sum)),
          data = data)))
}

object ResultDetails {

  final case class ResultDetailsRow(
      gamingDate: DateField,
      transactionTime: TimeField,
      patronId: PatronIdField,
      accountDesignation: AccountDesignationField,
      betId: BetIdField,
      eventType: SportDisciplineField,
      eventName: StringField,
      eventDate: DateTimeField,
      wagerDescription: StringField,
      betSelection: StringField,
      betPlacedAmount: MoneyField,
      betPaidAmount: MoneyField,
      canceledBetAmount: MoneyField,
      voidedBetAmount: MoneyField,
      resettledBetAdjustment: MoneyField,
      transactionImpactOnSportSpoolRevenue: MoneyField)
      extends RowType
}
