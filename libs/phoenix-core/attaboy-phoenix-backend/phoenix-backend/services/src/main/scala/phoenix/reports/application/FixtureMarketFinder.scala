package phoenix.reports.application

import scala.concurrent.ExecutionContext
import scala.concurrent.Future

import akka.actor.typed.ActorSystem
import akka.http.caching.scaladsl.Cache
import cats.data.OptionT

import phoenix.core.CacheConfig
import phoenix.core.CacheSupport
import phoenix.markets.MarketsBoundedContext.MarketId
import phoenix.reports.application.FixtureMarketFinder.MarketDoesNotExist
import phoenix.reports.domain.FixtureMarketRepository
import phoenix.reports.domain.model.markets.FixtureMarket

private[reports] final class FixtureMarketFinder(
    val repository: FixtureMarketRepository,
    val cache: Cache[MarketId, Option[FixtureMarket]])(implicit ec: ExecutionContext) {

  def find(marketId: MarketId): Future[FixtureMarket] = {
    OptionT(cache.getOrLoad(marketId, _ => repository.get(marketId).value))
      //TODO (PHXD-1515): should never happen, and we do not have clear guidelines how to approach failures/recovery for reports
      .getOrElseF(Future.failed(MarketDoesNotExist(marketId)))
  }
}

object FixtureMarketFinder extends CacheSupport {

  final case class MarketDoesNotExist(id: MarketId) extends RuntimeException

  def apply(underlying: FixtureMarketRepository, cacheConfig: CacheConfig)(implicit
      system: ActorSystem[_]): FixtureMarketFinder = {
    val cache = createCache[MarketId, Option[FixtureMarket]](system.classicSystem, cacheConfig)
    new FixtureMarketFinder(underlying, cache)(system.executionContext)
  }
}
