package phoenix.bets.support

import scala.concurrent.Future

import phoenix.bets.BetsBoundedContext.BetStatus
import phoenix.bets.domain.MarketBet
import phoenix.bets.domain.MarketBetsRepository
import phoenix.markets.MarketsBoundedContext.MarketId

final class TestMarketBetsRepository(var marketBets: List[MarketBet] = List.empty) extends MarketBetsRepository {
  override def save(bet: MarketBet): Future[Unit] =
    Future.successful {
      marketBets = marketBets :+ bet
    }

  override def openBetsForMarket(marketId: MarketId): Future[Set[MarketBet]] =
    betsWithStatusForMarket(marketId, BetStatus.Open)

  override def settledBetsForMarket(marketId: MarketId): Future[Set[MarketBet]] =
    betsWithStatusForMarket(marketId, BetStatus.Settled)

  private def betsWithStatusForMarket(marketId: MarketId, status: BetStatus): Future[Set[MarketBet]] =
    Future.successful {
      marketBets.filter(bet => bet.marketId == marketId && bet.betStatus == status).toSet
    }
}
