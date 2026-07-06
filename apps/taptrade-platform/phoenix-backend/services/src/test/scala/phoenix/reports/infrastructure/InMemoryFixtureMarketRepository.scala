package phoenix.reports.infrastructure

import scala.concurrent.ExecutionContext
import scala.concurrent.Future

import cats.data.OptionT

import phoenix.markets.MarketsBoundedContext
import phoenix.reports.domain.FixtureMarketRepository
import phoenix.reports.domain.model.markets.Fixture
import phoenix.reports.domain.model.markets.FixtureMarket
import phoenix.reports.domain.model.markets.Market
import phoenix.reports.domain.model.markets.MarketSelection

final class InMemoryFixtureMarketRepository(
    private var fixtures: List[Fixture] = List.empty,
    private var markets: List[Market] = List.empty,
    private var selections: List[MarketSelection] = List.empty)(implicit ec: ExecutionContext)
    extends FixtureMarketRepository {
  override def upsert(fixture: Fixture): Future[Unit] =
    Future.successful {
      fixtures = fixtures :+ fixture
    }

  override def upsert(market: Market): Future[Unit] =
    Future.successful {
      markets = markets :+ market
    }

  override def upsert(selection: Seq[MarketSelection]): Future[Unit] =
    Future.successful {
      selections = selections ++ selection
    }

  override def get(marketId: MarketsBoundedContext.MarketId): OptionT[Future, FixtureMarket] = {
    val maybeFixtureMarket = for {
      market <- markets.find(_.marketId == marketId)
      selection = selections.filter(_.marketId == marketId)
      fixture <- fixtures.find(_.fixtureId == market.fixtureId)
    } yield FixtureMarket(fixture, market, selection)
    OptionT.fromOption[Future](maybeFixtureMarket)
  }
}
