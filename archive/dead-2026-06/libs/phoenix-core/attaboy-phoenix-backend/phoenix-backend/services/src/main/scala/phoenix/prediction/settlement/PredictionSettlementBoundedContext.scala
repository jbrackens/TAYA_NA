package phoenix.prediction.settlement

import java.time.OffsetDateTime
import java.util.UUID

import scala.concurrent.ExecutionContext
import scala.concurrent.Future

import phoenix.prediction.common.PredictionMarketId

final case class SettlementSourceSnapshot(
    sourceKey: String,
    externalEventId: String,
    observedAt: OffsetDateTime,
    payload: String)

final case class SettlementDecision(
    marketId: PredictionMarketId,
    winningOutcomeId: UUID,
    settledAt: OffsetDateTime,
    rationale: String)

trait PredictionSettlementBoundedContext {
  def ingestSnapshot(marketId: PredictionMarketId, snapshot: SettlementSourceSnapshot)(implicit
      ec: ExecutionContext): Future[Unit]

  def settleMarket(decision: SettlementDecision)(implicit ec: ExecutionContext): Future[Unit]
}
