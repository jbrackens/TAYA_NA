package phoenix.prediction.settlement.application

import java.time.OffsetDateTime

import scala.concurrent.ExecutionContext
import scala.concurrent.Future

import org.slf4j.LoggerFactory

import phoenix.prediction.common.PredictionMarketId
import phoenix.prediction.settlement.application.DeterministicSettlement.decideClosePriceGtThreshold
import phoenix.prediction.settlement.application.DeterministicSettlement.hashPayload

final class DeterministicPredictionSettlementService(store: PredictionSettlementStore) {
  private val log = LoggerFactory.getLogger(getClass)

  /**
   * Deterministic settlement flow:
   * 1) hash and persist source snapshot
   * 2) compute winner using a rule with explicit inputs
   * 3) persist final resolution
   */
  def settleClosePriceGtThreshold(
      marketId: PredictionMarketId,
      sourceKey: String,
      externalEventId: String,
      closePrice: BigDecimal,
      threshold: BigDecimal,
      observedAt: OffsetDateTime,
      settledAt: OffsetDateTime,
      rawPayload: String)(implicit ec: ExecutionContext): Future[SettlementResolution] = {
    val payloadHash = hashPayload(rawPayload)
    val snapshot = SettlementSnapshot(
      marketId = marketId,
      sourceKey = sourceKey,
      externalEventId = externalEventId,
      observedAt = observedAt,
      payload = rawPayload,
      payloadHash = payloadHash)
    val resolution = decideClosePriceGtThreshold(
      marketId = marketId,
      closePrice = closePrice,
      threshold = threshold,
      settledAt = settledAt,
      payloadHash = payloadHash)

    for {
      _ <- store.persistSnapshot(snapshot)
      _ <- store.persistResolution(resolution)
      _ <- Future.successful(
        log.info(
          s"[prediction-settlement] market=${marketId.value} winner=${resolution.winningOutcomeKey} hash=$payloadHash"))
    } yield resolution
  }
}
