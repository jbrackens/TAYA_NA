package phoenix.reports.domain

import scala.concurrent.Future

import cats.data.OptionT

import phoenix.markets.MarketsBoundedContext.MarketId
import phoenix.reports.domain.model.markets.Fixture
import phoenix.reports.domain.model.markets.FixtureMarket
import phoenix.reports.domain.model.markets.Market
import phoenix.reports.domain.model.markets.MarketSelection

private[reports] trait FixtureMarketRepository {
  def upsert(fixture: Fixture): Future[Unit]
  def upsert(market: Market): Future[Unit]
  def upsert(selections: Seq[MarketSelection]): Future[Unit]
  def get(marketId: MarketId): OptionT[Future, FixtureMarket]
}
