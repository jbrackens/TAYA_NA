package phoenix.bets.domain
import scala.concurrent.Future

import phoenix.bets.BetEntity.BetId
import phoenix.bets.BetsBoundedContext.BetStatus
import phoenix.markets.MarketsBoundedContext.MarketId

trait MarketBetsRepository {
  def save(bet: MarketBet): Future[Unit]

  def openBetsForMarket(marketId: MarketId): Future[Set[MarketBet]]

  def settledBetsForMarket(marketId: MarketId): Future[Set[MarketBet]]
}

final case class MarketBet(betId: BetId, marketId: MarketId, betStatus: BetStatus)
