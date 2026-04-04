package phoenix.markets

import scala.concurrent.ExecutionContext
import scala.concurrent.Future

import akka.Done
import akka.actor.typed.ActorSystem
import akka.projection.eventsourced.EventEnvelope
import cats.data.NonEmptyList
import org.slf4j.LoggerFactory

import phoenix.markets.MarketProtocol.Events.MarketEvent
import phoenix.markets.MarketProtocol._
import phoenix.markets.MarketsRepository.MarketLifecycleChange
import phoenix.projections.ProjectionEventHandler

class MarketsProjectionHandler(system: ActorSystem[_], repository: MarketsRepository)
    extends ProjectionEventHandler[MarketEvent] {

  implicit private val ec: ExecutionContext = system.executionContext

  private val log = LoggerFactory.getLogger(getClass)

  override def process(envelope: EventEnvelope[MarketEvent]): Future[Done] = {
    log.debug("{}", envelope.event)

    envelope.event match {
      case Events.MarketCreated(marketId, lifecycle, info, selections, createdAt) =>
        val market = MarketsRepository.Market(
          marketId = marketId,
          name = info.name,
          fixtureId = info.fixtureId,
          marketType = info.marketType,
          category = info.category,
          selectionOdds = selections,
          specifiers = info.specifiers,
          lifecycleChanges = NonEmptyList.one(MarketLifecycleChange(lifecycle, createdAt)),
          createdAt = createdAt,
          updatedAt = createdAt)

        repository.save(market).map(_ => Done)

      case e: Events.MarketLifecycleEvent =>
        repository.addLifecycleChange(e.marketId, MarketLifecycleChange(e.lifecycle, e.updatedAt)).map(_ => Done)

      case Events.MarketOddsChanged(marketId, selectionOdds, _) =>
        repository.updateMarketOdds(marketId, selectionOdds).map(_ => Done)

      case Events.MarketInfoChanged(marketId, marketInfo, _) =>
        repository.updateMarketInfo(marketId, marketInfo)
    }
  }
}
