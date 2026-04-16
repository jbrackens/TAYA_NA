package phoenix.reports.domain.template.dgen113

import scala.concurrent.ExecutionContext
import scala.concurrent.Future

import phoenix.reports.domain.definition.Fields._
import phoenix.reports.domain.definition.ReportDefinition
import phoenix.reports.domain.definition.ReportDefinition.AggregationType.Sum
import phoenix.reports.domain.definition.ReportDefinition._
import phoenix.reports.domain.model.ReportingPeriod
import phoenix.reports.domain.template.ReportDataProvider
import phoenix.reports.domain.template.dgen113.Voids.PredictionVoidsRow
import phoenix.reports.domain.template.dgen113.Voids.VoidsRow

final class Voids(
    sportsDataProvider: ReportDataProvider[VoidsRow],
    predictionDataProvider: ReportDataProvider[PredictionVoidsRow])(implicit ec: ExecutionContext)
    extends ReportDefinition {

  override def report(reportingPeriod: ReportingPeriod): Future[Report] =
    for {
      sportsRows <- sportsDataProvider.getData(reportingPeriod)
      predictionRows <- predictionDataProvider.getData(reportingPeriod)
    } yield prepareReport(sportsRows, predictionRows)

  private def prepareReport(sportsData: Seq[VoidsRow], predictionData: Seq[PredictionVoidsRow]): Report =
    Report(
      name = "Voids Report",
      Seq[ReportTable](
        ReportTable(
          title = Some("Sportsbook"),
          index = 0,
          columns = Seq(
            HeadingColumn(displayName = "Gaming Date"),
            Column(displayName = "Transaction time"),
            Column(displayName = "Patron ID"),
            Column(displayName = "Account Designation (Real or Test)"),
            Column(displayName = "Bet ID"),
            Column(displayName = "Issuance Date & Time"),
            Column(displayName = "Event Type"),
            Column(displayName = "Event Name"),
            Column(displayName = "Event Date"),
            Column(displayName = "Wager description"),
            Column(displayName = "Bet Amount", aggregation = Sum),
            Column(displayName = "Employee Name / System Identifier"),
            Column(displayName = "Reason for Void")),
          data = sportsData),
        ReportTable(
          title = Some("Prediction Markets"),
          index = 1,
          columns = Seq(
            HeadingColumn(displayName = "Gaming Date"),
            Column(displayName = "Transaction time"),
            Column(displayName = "Patron ID"),
            Column(displayName = "Account Designation (Real or Test)"),
            Column(displayName = "Order ID"),
            Column(displayName = "Issuance Date & Time"),
            Column(displayName = "Market Category"),
            Column(displayName = "Market Title"),
            Column(displayName = "Market Close Date"),
            Column(displayName = "Position"),
            Column(displayName = "Stake Amount", aggregation = Sum),
            Column(displayName = "Employee Name / System Identifier"),
            Column(displayName = "Reason for Void")),
          data = predictionData)))
}

object Voids {

  final case class VoidsRow(
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
      employeeNameSystemIdentifier: AdminIdField,
      reasonForVoid: StringField)
      extends RowType

  final case class PredictionVoidsRow(
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
      employeeNameSystemIdentifier: StringField,
      reasonForVoid: StringField)
      extends RowType
}
