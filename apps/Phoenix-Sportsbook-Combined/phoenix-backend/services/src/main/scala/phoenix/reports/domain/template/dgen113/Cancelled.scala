package phoenix.reports.domain.template.dgen113

import scala.concurrent.ExecutionContext
import scala.concurrent.Future

import phoenix.reports.domain.definition.Fields._
import phoenix.reports.domain.definition.ReportDefinition
import phoenix.reports.domain.definition.ReportDefinition.AggregationType.Sum
import phoenix.reports.domain.definition.ReportDefinition._
import phoenix.reports.domain.model.ReportingPeriod
import phoenix.reports.domain.template.ReportDataProvider
import phoenix.reports.domain.template.dgen113.Cancelled.PredictionCancelledRow
import phoenix.reports.domain.template.dgen113.Cancelled.CancelledRow

final class Cancelled(
    sportsDataProvider: ReportDataProvider[CancelledRow],
    predictionDataProvider: ReportDataProvider[PredictionCancelledRow])(implicit ec: ExecutionContext)
    extends ReportDefinition {

  override def report(reportingPeriod: ReportingPeriod): Future[Report] = {
    for {
      sportsRows <- sportsDataProvider.getData(reportingPeriod)
      predictionRows <- predictionDataProvider.getData(reportingPeriod)
    } yield prepareReport(sportsRows, predictionRows)
  }

  private def prepareReport(
      sportsData: Seq[CancelledRow],
      predictionData: Seq[PredictionCancelledRow]): Report =
    Report(
      name = "Cancelled Report",
      Seq[ReportTable](
        ReportTable(
          title = Some("Sportsbook"),
          index = 0,
          columns = Seq(
            HeadingColumn(displayName = "Gaming Date"),
            Column(displayName = "Transaction Time"),
            Column(displayName = "Patron ID"),
            Column(displayName = "Account Designation (Real or Test)"),
            Column(displayName = "Bet ID"),
            Column(displayName = "Issuance Date & Time"),
            Column(displayName = "Event Type"),
            Column(displayName = "Event Name"),
            Column(displayName = "Event Date"),
            Column(displayName = "Wager description"),
            Column(displayName = "Bet Amount", aggregation = Sum),
            Column(displayName = "Reason for Cancellation")),
          data = sportsData),
        ReportTable(
          title = Some("Prediction Markets"),
          index = 1,
          columns = Seq(
            HeadingColumn(displayName = "Gaming Date"),
            Column(displayName = "Transaction Time"),
            Column(displayName = "Patron ID"),
            Column(displayName = "Account Designation (Real or Test)"),
            Column(displayName = "Order ID"),
            Column(displayName = "Issuance Date & Time"),
            Column(displayName = "Market Category"),
            Column(displayName = "Market Title"),
            Column(displayName = "Market Close Date"),
            Column(displayName = "Position"),
            Column(displayName = "Stake Amount", aggregation = Sum),
            Column(displayName = "Reason for Cancellation")),
          data = predictionData)))
}

object Cancelled {

  final case class CancelledRow(
      gamingDate: DateField,
      transactionTime: TimeField,
      patronId: PatronIdField,
      accountDesignation: AccountDesignationField,
      betId: BetIdField,
      issuanceDateTime: DateTimeField,
      eventType: SportDisciplineField,
      eventName: StringField,
      eventDate: DateTimeField,
      wagerDescription: StringField,
      betAmount: MoneyField,
      reasonForCancellation: StringField)
      extends RowType

  final case class PredictionCancelledRow(
      gamingDate: DateField,
      transactionTime: TimeField,
      patronId: PatronIdField,
      accountDesignation: AccountDesignationField,
      orderId: StringField,
      issuanceDateTime: DateTimeField,
      marketCategory: StringField,
      marketTitle: StringField,
      marketCloseDate: OptionalField[DateTimeField],
      position: StringField,
      stakeAmount: MoneyField,
      reasonForCancellation: StringField)
      extends RowType
}
