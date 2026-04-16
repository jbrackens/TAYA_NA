package phoenix.reports.support

import scala.concurrent.ExecutionContext
import scala.concurrent.Future
import scala.concurrent.duration.DurationInt
import scala.math.Ordered.orderingToOrdered

import akka.NotUsed
import akka.actor.typed.ActorSystem
import akka.stream.scaladsl.Source
import cats.syntax.foldable._

import phoenix.core.CacheConfig
import phoenix.core.CacheSupport
import phoenix.markets.MarketsBoundedContext.MarketId
import phoenix.reports.application.BetsFinder
import phoenix.reports.application.FixtureMarketFinder
import phoenix.reports.domain.Bet
import phoenix.reports.domain.BetEventsRepository
import phoenix.reports.domain.model.ReportingPeriod
import phoenix.reports.domain.model.bets.BetEvent
import phoenix.reports.domain.model.markets.FixtureMarket
import phoenix.reports.infrastructure.InMemoryBetsRepository
import phoenix.reports.infrastructure.InMemoryFixtureMarketRepository
import phoenix.support.FutureSupport

object BetStubs extends FutureSupport {
  def stubbedBetEvents(events: List[BetEvent]): BetEventsRepository =
    new BetEventsRepository {
      override def upsert(event: BetEvent): Future[Unit] = Future.unit
      override def findEventsWithinPeriod(period: ReportingPeriod): Source[BetEvent, NotUsed] =
        Source(events).filter(event =>
          event.operationTime >= period.periodStart && event.operationTime < period.periodEnd)
    }

  def finderWithExistingFixtureMarkets(markets: List[FixtureMarket])(implicit
      ec: ExecutionContext,
      system: ActorSystem[Nothing]): FixtureMarketFinder = {
    val repository = new InMemoryFixtureMarketRepository()
    val cache = CacheSupport.createCache[MarketId, Option[FixtureMarket]](
      system.classicSystem,
      CacheConfig(initialCapacity = 10, maxCapacity = 100, timeToLive = 5.hours, timeToIdle = 5.hours))

    await(markets.traverse_ { fixtureMarket =>
      for {
        _ <- repository.upsert(fixtureMarket.fixture)
        _ <- repository.upsert(fixtureMarket.market)
        _ <- repository.upsert(fixtureMarket.selections)
      } yield ()
    })

    new FixtureMarketFinder(repository, cache)
  }

  def stubbedBetsFinder(bets: List[Bet])(implicit ec: ExecutionContext): BetsFinder = {
    val repository = new InMemoryBetsRepository(bets)
    new BetsFinder(repository)
  }
}
