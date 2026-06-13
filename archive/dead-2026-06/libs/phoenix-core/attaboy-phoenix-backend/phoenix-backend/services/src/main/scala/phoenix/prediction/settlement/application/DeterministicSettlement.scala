package phoenix.prediction.settlement.application

import java.nio.charset.StandardCharsets
import java.security.MessageDigest
import java.time.OffsetDateTime

import phoenix.prediction.common.PredictionMarketId

final case class SettlementSnapshot(
    marketId: PredictionMarketId,
    sourceKey: String,
    externalEventId: String,
    observedAt: OffsetDateTime,
    payload: String,
    payloadHash: String)

final case class SettlementResolution(
    marketId: PredictionMarketId,
    winningOutcomeKey: String,
    settledAt: OffsetDateTime,
    rationale: String,
    payloadHash: String)

object DeterministicSettlement {
  val WinningOutcomeYes = "YES"
  val WinningOutcomeNo = "NO"

  def hashPayload(payload: String): String = {
    val digest = MessageDigest.getInstance("SHA-256").digest(payload.getBytes(StandardCharsets.UTF_8))
    digest.map("%02x".format(_)).mkString
  }

  def decideClosePriceGtThreshold(
      marketId: PredictionMarketId,
      closePrice: BigDecimal,
      threshold: BigDecimal,
      settledAt: OffsetDateTime,
      payloadHash: String): SettlementResolution = {
    val winner = if (closePrice > threshold) WinningOutcomeYes else WinningOutcomeNo
    SettlementResolution(
      marketId = marketId,
      winningOutcomeKey = winner,
      settledAt = settledAt,
      rationale = s"close_price_gt_threshold(closePrice=$closePrice, threshold=$threshold)",
      payloadHash = payloadHash)
  }
}
