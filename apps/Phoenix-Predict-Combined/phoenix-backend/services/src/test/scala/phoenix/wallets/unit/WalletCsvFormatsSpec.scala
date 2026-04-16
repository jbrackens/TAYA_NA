package phoenix.wallets.unit

import java.time.OffsetDateTime

import org.scalatest.matchers.should.Matchers
import org.scalatest.wordspec.AnyWordSpec

import phoenix.bets.BetEntity.BetId
import phoenix.core.currency.DefaultCurrencyMoney
import phoenix.prediction.infrastructure.PredictionOrderContextView
import phoenix.wallets.WalletTransaction
import phoenix.wallets.WalletTransactionView
import phoenix.wallets.WalletsBoundedContextProtocol.TransactionReason
import phoenix.wallets.WalletsBoundedContextProtocol.WalletId
import phoenix.wallets.infrastructure.WalletCsvFormats

final class WalletCsvFormatsSpec extends AnyWordSpec with Matchers {

  "WalletCsvFormats" should {
    "include rich prediction lifecycle context in exported payment method descriptors" in {
      val createdAt = OffsetDateTime.parse("2026-03-07T12:00:00Z")
      val transaction = WalletTransaction(
        reservationId = Some("res-123"),
        transactionId = "tx-123",
        walletId = WalletId("punter-123"),
        reason = TransactionReason.PredictionResettled,
        transactionAmount = DefaultCurrencyMoney(42),
        createdAt = createdAt,
        preTransactionBalance = DefaultCurrencyMoney(100),
        postTransactionBalance = DefaultCurrencyMoney(142),
        betId = Some(BetId("po-123")),
        externalId = None,
        paymentMethod = None)
      val predictionContext = PredictionOrderContextView(
        orderId = "po-123",
        marketId = "market-123",
        marketTitle = "Will Phoenix relaunch in 2026?",
        marketStatus = "resolved",
        outcomeId = "yes",
        outcomeLabel = "Yes",
        orderStatus = "resettled",
        winningOutcomeId = Some("yes"),
        winningOutcomeLabel = Some("Yes"),
        settledAt = Some("2026-03-07T11:00:00Z"),
        settlementReason = Some("manual correction"),
        settlementActor = Some("admin-7"),
        previousSettledAt = Some("2026-03-07T10:30:00Z"),
        previousSettledAmountUsd = Some(BigDecimal(84)),
        previousSettlementStatus = Some("won"))

      val csvFields =
        WalletCsvFormats.walletTransactionViewCsvFormat(
          WalletTransactionView.fromWalletTransaction(transaction, Some(predictionContext)))

      csvFields(3) should include("PREDICTION_MARKET(Will Phoenix relaunch in 2026?")
      csvFields(3) should include("market_status=resolved")
      csvFields(3) should include("outcome=Yes")
      csvFields(3) should include("order_status=resettled")
      csvFields(3) should include("resolved_to=Yes")
      csvFields(3) should include("reason=manual correction")
      csvFields(3) should include("settled_by=admin-7")
      csvFields(3) should include("previous_status=won")
    }
  }
}
