package phoenix.reports.application.dataprovider.dgen113

import scala.concurrent.ExecutionContext
import scala.concurrent.Future

import phoenix.reports.application.dataprovider.dge19.PredictionReportingSummaryProvider
import phoenix.reports.domain.definition.Fields.DateField
import phoenix.reports.domain.definition.Fields.MoneyField
import phoenix.reports.domain.definition.Fields.StringField
import phoenix.reports.domain.model.ReportingPeriod
import phoenix.reports.domain.template.ReportDataProvider
import phoenix.reports.domain.template.dgen113.ResultSummary.PredictionResultSummaryRow

final class ResultSummaryPredictionData(
    predictionSummaries: PredictionReportingSummaryProvider = PredictionReportingSummaryProvider.noop)(implicit
    ec: ExecutionContext)
    extends ReportDataProvider[PredictionResultSummaryRow] {

  override def provideData(reportingPeriod: ReportingPeriod): Future[Seq[PredictionResultSummaryRow]] =
    predictionSummaries
      .summarizeResultCategories(reportingPeriod)
      .map(
        _.map(summary =>
          PredictionResultSummaryRow(
            gamingDate = DateField(reportingPeriod.periodStart),
            marketCategory = StringField(summary.categoryLabel),
            ticketBetSales = MoneyField(summary.ticketBetSales.amount),
            ticketsBetsPaid = MoneyField(summary.ticketsBetsPaid.amount),
            ticketsBetsCancelled = MoneyField(summary.ticketsBetsCancelled.amount),
            ticketsBetsVoided = MoneyField(summary.ticketsBetsVoided.amount),
            resettledBetAdjustment = MoneyField(summary.resettledBetAdjustment.amount),
            netPredictionMarketGrossRevenue = MoneyField(summary.netPredictionGrossRevenue.amount))))
}
