package phoenix.reports.domain.template.dgen113

import scala.concurrent.ExecutionContext
import scala.concurrent.Future

import phoenix.reports.domain.definition.Fields._
import phoenix.reports.domain.definition.ReportDefinition
import phoenix.reports.domain.definition.ReportDefinition.AggregationType.Sum
import phoenix.reports.domain.definition.ReportDefinition._
import phoenix.reports.domain.model.ReportingPeriod
import phoenix.reports.domain.template.ReportDataProvider
import phoenix.reports.domain.template.dgen113.SportsLiability.SportsLiabilityRow

final class SportsLiability(dataProvider: ReportDataProvider[SportsLiabilityRow])(implicit ec: ExecutionContext)
    extends ReportDefinition {

  override def report(reportingPeriod: ReportingPeriod): Future[Report] = {
    val rows = dataProvider.getData(reportingPeriod)
    rows.map(prepareReport)
  }

  private def prepareReport(data: Seq[SportsLiabilityRow]): Report =
    Report(
      name = "Sports Liability Report",
      Seq[ReportTable](
        ReportTable(
          index = 0,
          columns = Seq(
            HeadingColumn(displayName = "Gaming Date"),
            Column(displayName = "Patron ID"),
            Column(displayName = "Account Designation (Real or Test)"),
            Column(displayName = "Bet ID"),
            Column(displayName = "Event Type"),
            Column(displayName = "Event Name"),
            //TODO (PHXD-1445): in all reports this column is named "Issuance..."
            // and the order of columns is consistent: "Bet ID", "Issuance Date & Time", "Event Type", "Event Name", "Event Date"
            Column(displayName = "Bet Date & Time"),
            Column(displayName = "Event Date"),
            Column(displayName = "Wager description"),
            Column(displayName = "Bet Selection"),
            Column(displayName = "Bet Amount", aggregation = Sum),
            Column(displayName = "Status")),
          data = data)))
}

object SportsLiability {

  final case class SportsLiabilityRow(
      gamingDate: DateField,
      patronId: PatronIdField,
      accountDesignation: AccountDesignationField,
      betId: BetIdField,
      eventType: SportDisciplineField,
      eventName: StringField,
      betDateTime: DateTimeField,
      eventDate: DateTimeField,
      wagerDescription: StringField,
      betSelection: StringField,
      betAmount: MoneyField,
      status: BetStatusField)
      extends RowType
}
