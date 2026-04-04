package phoenix.reports.application.dataprovider.dge19

import scala.concurrent.ExecutionContext
import scala.concurrent.Future

import phoenix.reports.domain.definition.Fields.DateField
import phoenix.reports.domain.definition.Fields.MoneyField
import phoenix.reports.domain.definition.Fields.StringField
import phoenix.reports.domain.model.ReportingPeriod
import phoenix.reports.domain.template.ReportDataProvider
import phoenix.reports.domain.template.dge19.WageringSummary.PredictionMarketRow

final class WageringSummaryPredictionData(
    predictionSummaries: PredictionReportingSummaryProvider = PredictionReportingSummaryProvider.noop)(implicit
    ec: ExecutionContext)
    extends ReportDataProvider[PredictionMarketRow] {

  override def provideData(reportingPeriod: ReportingPeriod): Future[Seq[PredictionMarketRow]] =
    predictionSummaries
      .summarizeMarkets(reportingPeriod)
      .map(
        _.map(summary =>
          PredictionMarketRow(
            gamingDate = DateField(reportingPeriod.periodStart),
            marketName = StringField(summary.marketTitle),
            category = StringField(summary.categoryLabel),
            transfersToPrediction = MoneyField(summary.transfersToPrediction.amount),
            transfersFromPrediction = MoneyField(summary.transfersFromPrediction.amount),
            cancelledPredictionOrders = MoneyField(summary.cancelledPredictionOrders.amount),
            predictionWinLoss = MoneyField(summary.predictionWinLoss.amount))))
}
