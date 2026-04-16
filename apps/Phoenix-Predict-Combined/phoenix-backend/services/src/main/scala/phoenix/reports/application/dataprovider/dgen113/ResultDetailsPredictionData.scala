package phoenix.reports.application.dataprovider.dgen113

import scala.concurrent.ExecutionContext
import scala.concurrent.Future

import cats.instances.future._
import cats.syntax.traverse._

import phoenix.reports.application.PuntersFinder
import phoenix.reports.application.dataprovider.dge19.PredictionReportingSummaryProvider
import phoenix.reports.application.dataprovider.dge19.PredictionResultDetailSummary
import phoenix.reports.domain.definition.Fields._
import phoenix.reports.domain.model.ReportingPeriod
import phoenix.reports.domain.template.ReportDataProvider
import phoenix.reports.domain.template.dgen113.ResultDetails.PredictionResultDetailsRow

final class ResultDetailsPredictionData(
    predictionProvider: PredictionReportingSummaryProvider,
    puntersFinder: PuntersFinder)(implicit ec: ExecutionContext)
    extends ReportDataProvider[PredictionResultDetailsRow] {

  override protected def provideData(reportingPeriod: ReportingPeriod): Future[Seq[PredictionResultDetailsRow]] =
    for {
      summaries <- predictionProvider.summarizeResultDetails(reportingPeriod)
      rows <- summaries.toList.traverse(summary => buildRow(reportingPeriod, summary))
    } yield rows.sortBy(row => (row.transactionTime.value.toInstant, row.orderId.value))

  private def buildRow(
      reportingPeriod: ReportingPeriod,
      summary: PredictionResultDetailSummary): Future[PredictionResultDetailsRow] =
    puntersFinder.find(summary.punterId).map { punterProfile =>
      PredictionResultDetailsRow(
        gamingDate = DateField(reportingPeriod.periodStart),
        transactionTime = TimeField(summary.transactionTime),
        patronId = PatronIdField(summary.punterId),
        accountDesignation = AccountDesignationField(punterProfile.designation()),
        orderId = StringField(summary.orderId),
        marketCategory = StringField(summary.categoryLabel),
        marketTitle = StringField(summary.marketTitle),
        position = StringField(summary.outcomeLabel),
        orderPlacedAmount = MoneyField(summary.stakePlacedAmount.amount),
        orderPaidAmount = MoneyField(summary.paidAmount.amount),
        canceledOrderAmount = MoneyField(summary.cancelledAmount.amount),
        voidedOrderAmount = MoneyField(summary.voidedAmount.amount),
        resettledOrderAdjustment = MoneyField(summary.resettledAdjustment.amount),
        transactionImpactOnPredictionRevenue = MoneyField(summary.netPredictionRevenueImpact.amount))
    }
}
