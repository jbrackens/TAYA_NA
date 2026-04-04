package phoenix.reports.application.dataprovider.dge19

import java.time.OffsetDateTime
import java.time.ZoneOffset

import org.scalatest.matchers.should.Matchers
import org.scalatest.wordspec.AnyWordSpecLike

import phoenix.prediction.infrastructure.http.PredictionOrderView
import phoenix.punters.PunterEntity.PunterId
import phoenix.reports.domain.model.ReportingPeriod
import phoenix.time.FakeHardcodedClock

final class PredictionReportingSummaryProviderSpec extends AnyWordSpecLike with Matchers {

  private val clock = new FakeHardcodedClock(OffsetDateTime.of(2026, 3, 2, 12, 0, 0, 0, ZoneOffset.UTC))
  private val reportingPeriod = ReportingPeriod.enclosingDay(clock.currentOffsetDateTime(), clock)

  "PredictionReportingSummaryProvider" should {
    "summarize per-punter prediction activity for reports" in {
      val orders = Seq(
        predictionOrder(
          orderId = "po-open",
          punterId = "punter-1",
          marketId = "pm-btc",
          marketTitle = "BTC above $120k",
          categoryLabel = "Crypto",
          status = "open",
          stakeUsd = BigDecimal(25),
          maxPayoutUsd = BigDecimal(40),
          maxProfitUsd = BigDecimal(15),
          createdAt = reportingPeriod.periodStart.plusHours(1),
          updatedAt = reportingPeriod.periodStart.plusHours(1)),
        predictionOrder(
          orderId = "po-won",
          punterId = "punter-1",
          marketId = "pm-btc",
          marketTitle = "BTC above $120k",
          categoryLabel = "Crypto",
          status = "won",
          stakeUsd = BigDecimal(10),
          maxPayoutUsd = BigDecimal(18),
          maxProfitUsd = BigDecimal(8),
          createdAt = reportingPeriod.periodStart.plusHours(2),
          updatedAt = reportingPeriod.periodStart.plusHours(5)),
        predictionOrder(
          orderId = "po-cancelled",
          punterId = "punter-1",
          marketId = "pm-eth",
          marketTitle = "ETH above $8k",
          categoryLabel = "Crypto",
          status = "cancelled",
          stakeUsd = BigDecimal(7),
          maxPayoutUsd = BigDecimal(12),
          maxProfitUsd = BigDecimal(5),
          createdAt = reportingPeriod.periodStart.plusHours(3),
          updatedAt = reportingPeriod.periodStart.plusHours(4)),
        predictionOrder(
          orderId = "po-ignored",
          punterId = "punter-1",
          marketId = "pm-old",
          marketTitle = "Old market",
          categoryLabel = "Politics",
          status = "lost",
          stakeUsd = BigDecimal(15),
          maxPayoutUsd = BigDecimal(0),
          maxProfitUsd = BigDecimal(0),
          createdAt = reportingPeriod.periodStart.minusDays(2),
          updatedAt = reportingPeriod.periodStart.minusDays(2)))

      val summary = PredictionReportingSummaryProvider
        .summarizePunterOrders(reportingPeriod, orders)

      summary.transfersToPrediction.amount shouldBe BigDecimal(42)
      summary.cancelledPredictionOrders.amount shouldBe BigDecimal(7)
      summary.transfersFromPrediction.amount shouldBe BigDecimal(18)
      summary.endingPredictionExposure.amount shouldBe BigDecimal(25)
      summary.patronPredictionWinLoss.amount shouldBe BigDecimal(8)
    }

    "summarize per-market prediction activity for wagering reports" in {
      val orders = Seq(
        predictionOrder(
          orderId = "po-1",
          punterId = "punter-1",
          marketId = "pm-btc",
          marketTitle = "BTC above $120k",
          categoryLabel = "Crypto",
          status = "won",
          stakeUsd = BigDecimal(10),
          maxPayoutUsd = BigDecimal(18),
          maxProfitUsd = BigDecimal(8),
          createdAt = reportingPeriod.periodStart.plusHours(1),
          updatedAt = reportingPeriod.periodStart.plusHours(3)),
        predictionOrder(
          orderId = "po-2",
          punterId = "punter-2",
          marketId = "pm-btc",
          marketTitle = "BTC above $120k",
          categoryLabel = "Crypto",
          status = "cancelled",
          stakeUsd = BigDecimal(6),
          maxPayoutUsd = BigDecimal(11),
          maxProfitUsd = BigDecimal(5),
          createdAt = reportingPeriod.periodStart.plusHours(2),
          updatedAt = reportingPeriod.periodStart.plusHours(4)),
        predictionOrder(
          orderId = "po-3",
          punterId = "punter-3",
          marketId = "pm-fed",
          marketTitle = "Fed cuts before July",
          categoryLabel = "Macro",
          status = "lost",
          stakeUsd = BigDecimal(20),
          maxPayoutUsd = BigDecimal(0),
          maxProfitUsd = BigDecimal(0),
          createdAt = reportingPeriod.periodStart.plusHours(1),
          updatedAt = reportingPeriod.periodStart.plusHours(6)))

      val summaries = PredictionReportingSummaryProvider.summarizeMarkets(reportingPeriod, orders)

      summaries shouldBe Seq(
        PredictionMarketReportSummary(
          marketTitle = "BTC above $120k",
          categoryLabel = "Crypto",
          transfersToPrediction = phoenix.core.currency.MoneyAmount(16),
          transfersFromPrediction = phoenix.core.currency.MoneyAmount(18),
          cancelledPredictionOrders = phoenix.core.currency.MoneyAmount(6),
          predictionWinLoss = phoenix.core.currency.MoneyAmount(8)),
        PredictionMarketReportSummary(
          marketTitle = "Fed cuts before July",
          categoryLabel = "Macro",
          transfersToPrediction = phoenix.core.currency.MoneyAmount(20),
          transfersFromPrediction = phoenix.core.currency.MoneyAmount(0),
          cancelledPredictionOrders = phoenix.core.currency.MoneyAmount(0),
          predictionWinLoss = phoenix.core.currency.MoneyAmount(-20)))
    }

    "summarize prediction result categories for dgen113 result summaries" in {
      val orders = Seq(
        predictionOrder(
          orderId = "po-1",
          punterId = "punter-1",
          marketId = "pm-btc",
          marketTitle = "BTC above $120k",
          categoryLabel = "Crypto",
          status = "won",
          stakeUsd = BigDecimal(10),
          maxPayoutUsd = BigDecimal(18),
          maxProfitUsd = BigDecimal(8),
          createdAt = reportingPeriod.periodStart.plusHours(1),
          updatedAt = reportingPeriod.periodStart.plusHours(3)),
        predictionOrder(
          orderId = "po-2",
          punterId = "punter-2",
          marketId = "pm-btc",
          marketTitle = "BTC above $120k",
          categoryLabel = "Crypto",
          status = "cancelled",
          stakeUsd = BigDecimal(6),
          maxPayoutUsd = BigDecimal(11),
          maxProfitUsd = BigDecimal(5),
          createdAt = reportingPeriod.periodStart.plusHours(2),
          updatedAt = reportingPeriod.periodStart.plusHours(4)),
        predictionOrder(
          orderId = "po-3",
          punterId = "punter-3",
          marketId = "pm-fed",
          marketTitle = "Fed cuts before July",
          categoryLabel = "Macro",
          status = "voided",
          stakeUsd = BigDecimal(20),
          maxPayoutUsd = BigDecimal(20),
          maxProfitUsd = BigDecimal(0),
          createdAt = reportingPeriod.periodStart.plusHours(1),
          updatedAt = reportingPeriod.periodStart.plusHours(6)),
        predictionOrder(
          orderId = "po-4",
          punterId = "punter-4",
          marketId = "pm-fed",
          marketTitle = "Fed cuts before July",
          categoryLabel = "Macro",
          status = "resettled",
          stakeUsd = BigDecimal(12),
          maxPayoutUsd = BigDecimal(9),
          maxProfitUsd = BigDecimal(-3),
          createdAt = reportingPeriod.periodStart.plusHours(2),
          updatedAt = reportingPeriod.periodStart.plusHours(7)))

      val summaries = PredictionReportingSummaryProvider.summarizeResultCategories(reportingPeriod, orders)

      summaries shouldBe Seq(
        PredictionResultCategorySummary(
          categoryLabel = "Crypto",
          ticketBetSales = phoenix.core.currency.MoneyAmount(16),
          ticketsBetsPaid = phoenix.core.currency.MoneyAmount(18),
          ticketsBetsCancelled = phoenix.core.currency.MoneyAmount(6),
          ticketsBetsVoided = phoenix.core.currency.MoneyAmount(0),
          resettledBetAdjustment = phoenix.core.currency.MoneyAmount(0),
          netPredictionGrossRevenue = phoenix.core.currency.MoneyAmount(-8)),
        PredictionResultCategorySummary(
          categoryLabel = "Macro",
          ticketBetSales = phoenix.core.currency.MoneyAmount(32),
          ticketsBetsPaid = phoenix.core.currency.MoneyAmount(0),
          ticketsBetsCancelled = phoenix.core.currency.MoneyAmount(0),
          ticketsBetsVoided = phoenix.core.currency.MoneyAmount(20),
          resettledBetAdjustment = phoenix.core.currency.MoneyAmount(-3),
          netPredictionGrossRevenue = phoenix.core.currency.MoneyAmount(15)))
    }

    "summarize prediction result details for dgen113 result detail rows" in {
      val orders = Seq(
        predictionOrder(
          orderId = "po-won",
          punterId = "punter-1",
          marketId = "pm-btc",
          marketTitle = "BTC above $120k",
          categoryLabel = "Crypto",
          status = "won",
          stakeUsd = BigDecimal(10),
          maxPayoutUsd = BigDecimal(18),
          maxProfitUsd = BigDecimal(8),
          createdAt = reportingPeriod.periodStart.plusHours(1),
          updatedAt = reportingPeriod.periodStart.plusHours(3)),
        predictionOrder(
          orderId = "po-cancelled",
          punterId = "punter-2",
          marketId = "pm-fed",
          marketTitle = "Fed cuts before July",
          categoryLabel = "Macro",
          status = "cancelled",
          stakeUsd = BigDecimal(6),
          maxPayoutUsd = BigDecimal(11),
          maxProfitUsd = BigDecimal(5),
          createdAt = reportingPeriod.periodStart.plusHours(2),
          updatedAt = reportingPeriod.periodStart.plusHours(4)),
        predictionOrder(
          orderId = "po-voided",
          punterId = "punter-3",
          marketId = "pm-tech",
          marketTitle = "AI device launch before Q4",
          categoryLabel = "Technology",
          status = "voided",
          stakeUsd = BigDecimal(12),
          maxPayoutUsd = BigDecimal(12),
          maxProfitUsd = BigDecimal(0),
          createdAt = reportingPeriod.periodStart.plusHours(2),
          updatedAt = reportingPeriod.periodStart.plusHours(5)),
        predictionOrder(
          orderId = "po-open",
          punterId = "punter-4",
          marketId = "pm-open",
          marketTitle = "Open market",
          categoryLabel = "Politics",
          status = "open",
          stakeUsd = BigDecimal(20),
          maxPayoutUsd = BigDecimal(32),
          maxProfitUsd = BigDecimal(12),
          createdAt = reportingPeriod.periodStart.plusHours(2),
          updatedAt = reportingPeriod.periodStart.plusHours(2)))

      val summaries = PredictionReportingSummaryProvider.summarizeResultDetails(reportingPeriod, orders)

      summaries shouldBe Seq(
        PredictionResultDetailSummary(
          orderId = "po-won",
          punterId = PunterId("punter-1"),
          categoryLabel = "Crypto",
          marketTitle = "BTC above $120k",
          outcomeLabel = "Yes",
          transactionTime = reportingPeriod.periodStart.plusHours(3),
          stakePlacedAmount = phoenix.core.currency.MoneyAmount(10),
          paidAmount = phoenix.core.currency.MoneyAmount(18),
          cancelledAmount = phoenix.core.currency.MoneyAmount(0),
          voidedAmount = phoenix.core.currency.MoneyAmount(0),
          resettledAdjustment = phoenix.core.currency.MoneyAmount(0),
          netPredictionRevenueImpact = phoenix.core.currency.MoneyAmount(-8)),
        PredictionResultDetailSummary(
          orderId = "po-cancelled",
          punterId = PunterId("punter-2"),
          categoryLabel = "Macro",
          marketTitle = "Fed cuts before July",
          outcomeLabel = "Yes",
          transactionTime = reportingPeriod.periodStart.plusHours(4),
          stakePlacedAmount = phoenix.core.currency.MoneyAmount(6),
          paidAmount = phoenix.core.currency.MoneyAmount(0),
          cancelledAmount = phoenix.core.currency.MoneyAmount(6),
          voidedAmount = phoenix.core.currency.MoneyAmount(0),
          resettledAdjustment = phoenix.core.currency.MoneyAmount(0),
          netPredictionRevenueImpact = phoenix.core.currency.MoneyAmount(0)),
        PredictionResultDetailSummary(
          orderId = "po-voided",
          punterId = PunterId("punter-3"),
          categoryLabel = "Technology",
          marketTitle = "AI device launch before Q4",
          outcomeLabel = "Yes",
          transactionTime = reportingPeriod.periodStart.plusHours(5),
          stakePlacedAmount = phoenix.core.currency.MoneyAmount(12),
          paidAmount = phoenix.core.currency.MoneyAmount(0),
          cancelledAmount = phoenix.core.currency.MoneyAmount(0),
          voidedAmount = phoenix.core.currency.MoneyAmount(12),
          resettledAdjustment = phoenix.core.currency.MoneyAmount(0),
          netPredictionRevenueImpact = phoenix.core.currency.MoneyAmount(0)))
    }
  }

  private def predictionOrder(
      orderId: String,
      punterId: String,
      marketId: String,
      marketTitle: String,
      categoryLabel: String,
      status: String,
      stakeUsd: BigDecimal,
      maxPayoutUsd: BigDecimal,
      maxProfitUsd: BigDecimal,
      createdAt: OffsetDateTime,
      updatedAt: OffsetDateTime): PredictionOrderView =
    PredictionOrderView(
      orderId = orderId,
      punterId = punterId,
      marketId = marketId,
      marketTitle = marketTitle,
      categoryKey = categoryLabel.toLowerCase,
      categoryLabel = categoryLabel,
      outcomeId = "yes",
      outcomeLabel = "Yes",
      priceCents = 50,
      stakeUsd = stakeUsd,
      shares = BigDecimal(1),
      maxPayoutUsd = maxPayoutUsd,
      maxProfitUsd = maxProfitUsd,
      status = status,
      createdAt = createdAt.toString,
      updatedAt = updatedAt.toString)
}
