package phoenix.prediction.markets

import scala.concurrent.ExecutionContext
import scala.concurrent.Future

import phoenix.prediction.common.MarketSpec
import phoenix.prediction.common.PredictionMarketId
import phoenix.prediction.common.PredictionOutcomeId
import phoenix.prediction.common.SettlementSpec

trait PredictionMarketsBoundedContext {
  def createMarket(spec: MarketSpec, settlementSpec: SettlementSpec)(implicit
      ec: ExecutionContext): Future[PredictionMarketId]

  def suspendMarket(marketId: PredictionMarketId, reason: String)(implicit ec: ExecutionContext): Future[Unit]

  def resolveMarket(marketId: PredictionMarketId, winningOutcome: PredictionOutcomeId)(implicit
      ec: ExecutionContext): Future[Unit]
}
