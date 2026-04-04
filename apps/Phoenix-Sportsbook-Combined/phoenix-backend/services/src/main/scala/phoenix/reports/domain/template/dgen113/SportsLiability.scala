package phoenix.reports.domain.template.dgen113

import scala.concurrent.ExecutionContext
import scala.concurrent.Future

import phoenix.reports.domain.definition.Fields._
import phoenix.reports.domain.definition.ReportDefinition
import phoenix.reports.domain.definition.ReportDefinition.AggregationType.Sum
import phoenix.reports.domain.definition.ReportDefinition._
import phoenix.reports.domain.model.ReportingPeriod
import phoenix.reports.domain.template.ReportDataProvider
import phoenix.reports.domain.template.dgen113.SportsLiability.PredictionLiabilityRow
import phoenix.reports.domain.template.dgen113.SportsLiability.SportsLiabilityRow

final class SportsLiability(
    sportsDataProvider: ReportDataProvider[SportsLiabilityRow],
    predictionDataProvider: ReportDataProvider[PredictionLiabilityRow])(implicit ec: ExecutionContext)
    extends ReportDefinition {

  override def report(reportingPeriod: ReportingPeriod): Future[Report] = {
    for {
      sportsRows <- sportsDataProvider.getData(reportingPeriod)
      predictionRows <- predictionDataProvider.getData(reportingPeriod)
    } yield prepareReport(sportsRows, predictionRows)
  }

  private def prepareReport(
      sportsData: Seq[SportsLiabilityRow],
      predictionData: Seq[PredictionLiabilityRow]): Report =
    Report(
      name = "Sports Liability Report",
      Seq[ReportTable](
        ReportTable(
          title = Some("Sportsbook"),
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
          data = sportsData),
        ReportTable(
          title = Some("Prediction Markets"),
          index = 1,
          columns = Seq(
            HeadingColumn(displayName = "Gaming Date"),
            Column(displayName = "Patron ID"),
            Column(displayName = "Account Designation (Real or Test)"),
            Column(displayName = "Order ID"),
            Column(displayName = "Market Category"),
            Column(displayName = "Market Title"),
            Column(displayName = "Order Date & Time"),
            Column(displayName = "Market Close Date"),
            Column(displayName = "Position"),
            Column(displayName = "Stake Amount", aggregation = Sum),
            Column(displayName = "Status")),
          data = predictionData)))
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

  final case class PredictionLiabilityRow(
      gamingDate: DateField,
      patronId: PatronIdField,
      accountDesignation: AccountDesignationField,
      orderId: StringField,
      marketCategory: StringField,
      marketTitle: StringField,
      orderDateTime: DateTimeField,
      marketCloseDate: OptionalField[DateTimeField],
      position: StringField,
      stakeAmount: MoneyField,
      status: StringField)
      extends RowType
}
