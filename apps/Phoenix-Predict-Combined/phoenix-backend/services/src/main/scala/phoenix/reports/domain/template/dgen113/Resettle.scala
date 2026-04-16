package phoenix.reports.domain.template.dgen113

import scala.concurrent.ExecutionContext
import scala.concurrent.Future

import phoenix.reports.domain.definition.Fields._
import phoenix.reports.domain.definition.ReportDefinition
import phoenix.reports.domain.definition.ReportDefinition.AggregationType.Sum
import phoenix.reports.domain.definition.ReportDefinition._
import phoenix.reports.domain.model.ReportingPeriod
import phoenix.reports.domain.template.ReportDataProvider
import phoenix.reports.domain.template.dgen113.Resettle.PredictionResettleRow
import phoenix.reports.domain.template.dgen113.Resettle.ResettleRow

final class Resettle(
    sportsDataProvider: ReportDataProvider[ResettleRow],
    predictionDataProvider: ReportDataProvider[PredictionResettleRow])(implicit ec: ExecutionContext)
    extends ReportDefinition {

  override def report(reportingPeriod: ReportingPeriod): Future[Report] =
    for {
      sportsRows <- sportsDataProvider.getData(reportingPeriod)
      predictionRows <- predictionDataProvider.getData(reportingPeriod)
    } yield prepareReport(sportsRows, predictionRows)

  private def prepareReport(sportsData: Seq[ResettleRow], predictionData: Seq[PredictionResettleRow]): Report =
    Report(
      name = "Resettle Report",
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
            Column(displayName = "Event Date"),
            Column(displayName = "Wager description"),
            Column(displayName = "Bet Selection"),
            Column(displayName = "Initial Settlement Date & Time"),
            Column(displayName = "Resettlement Date & Time"),
            Column(displayName = "Unsettled Amount", aggregation = Sum),
            Column(displayName = "Resettled Amount", aggregation = Sum),
            Column(displayName = "Net adjustment", aggregation = Sum)),
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
            Column(displayName = "Position"),
            Column(displayName = "Initial Settlement Date & Time"),
            Column(displayName = "Resettlement Date & Time"),
            Column(displayName = "Unsettled Amount", aggregation = Sum),
            Column(displayName = "Resettled Amount", aggregation = Sum),
            Column(displayName = "Net adjustment", aggregation = Sum)),
          data = predictionData)))
}

object Resettle {

  final case class ResettleRow(
      gamingDate: DateField,
      patronId: PatronIdField,
      accountDesignation: AccountDesignationField,
      betId: BetIdField,
      eventType: SportDisciplineField,
      eventName: StringField,
      eventDate: DateTimeField,
      wagerDescription: StringField,
      betSelection: StringField,
      initialSettlementDateTime: DateTimeField,
      resettlementDateTime: DateTimeField,
      unsettledAmount: MoneyField,
      resettledAmount: MoneyField,
      netAdjustment: MoneyField)
      extends RowType

  final case class PredictionResettleRow(
      gamingDate: DateField,
      patronId: PatronIdField,
      accountDesignation: AccountDesignationField,
      orderId: StringField,
      marketCategory: StringField,
      marketTitle: StringField,
      position: StringField,
      initialSettlementDateTime: DateTimeField,
      resettlementDateTime: DateTimeField,
      unsettledAmount: MoneyField,
      resettledAmount: MoneyField,
      netAdjustment: MoneyField)
      extends RowType
}
