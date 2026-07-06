package phoenix.reports.domain.template.dgen113

import scala.concurrent.ExecutionContext
import scala.concurrent.Future

import phoenix.reports.domain.definition.Fields._
import phoenix.reports.domain.definition.ReportDefinition
import phoenix.reports.domain.definition.ReportDefinition.AggregationType.Sum
import phoenix.reports.domain.definition.ReportDefinition._
import phoenix.reports.domain.model.ReportingPeriod
import phoenix.reports.domain.template.ReportDataProvider
import phoenix.reports.domain.template.dgen113.ResultDetails.PredictionResultDetailsRow
import phoenix.reports.domain.template.dgen113.ResultDetails.ResultDetailsRow

final class ResultDetails(
    sportsDataProvider: ReportDataProvider[ResultDetailsRow],
    predictionDataProvider: ReportDataProvider[PredictionResultDetailsRow])(implicit ec: ExecutionContext)
    extends ReportDefinition {

  override def report(reportingPeriod: ReportingPeriod): Future[Report] = {
    for {
      sportsRows <- sportsDataProvider.getData(reportingPeriod)
      predictionRows <- predictionDataProvider.getData(reportingPeriod)
    } yield prepareReport(sportsRows, predictionRows)
  }

  private def prepareReport(
      sportsData: Seq[ResultDetailsRow],
      predictionData: Seq[PredictionResultDetailsRow]): Report =
    Report(
      name = "Result Details Report",
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
            Column(displayName = "Market Category"),
            Column(displayName = "Market Title"),
            Column(displayName = "Position"),
            Column(displayName = "Order Placed Amount", aggregation = Sum),
            Column(displayName = "Order Paid Amount", aggregation = Sum),
            Column(displayName = "Canceled Order Amount", aggregation = Sum),
            Column(displayName = "Voided Order Amount", aggregation = Sum),
            Column(displayName = "Resettled Order Adjustment", aggregation = Sum),
            Column(displayName = "Transaction Impact On Prediction Revenue", aggregation = Sum)),
          data = predictionData)))
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

  final case class PredictionResultDetailsRow(
      gamingDate: DateField,
      transactionTime: TimeField,
      patronId: PatronIdField,
      accountDesignation: AccountDesignationField,
      orderId: StringField,
      marketCategory: StringField,
      marketTitle: StringField,
      position: StringField,
      orderPlacedAmount: MoneyField,
      orderPaidAmount: MoneyField,
      canceledOrderAmount: MoneyField,
      voidedOrderAmount: MoneyField,
      resettledOrderAdjustment: MoneyField,
      transactionImpactOnPredictionRevenue: MoneyField)
      extends RowType
}
