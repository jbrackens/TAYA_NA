package phoenix.reports.application.es

import scala.concurrent.ExecutionContext
import scala.concurrent.Future

import akka.Done
import akka.projection.eventsourced.EventEnvelope
import org.slf4j.LoggerFactory

import phoenix.markets.MarketProtocol.Events
import phoenix.markets.MarketProtocol.Events.MarketEvent
import phoenix.projections.ProjectionEventHandler
import phoenix.reports.domain.FixtureMarketRepository
import phoenix.reports.domain.model.markets.Market
import phoenix.reports.domain.model.markets.MarketSelection

final class MarketReportingEventHandler(repository: FixtureMarketRepository)(implicit ec: ExecutionContext)
    extends ProjectionEventHandler[MarketEvent] {

  override def process(envelope: EventEnvelope[MarketEvent]): Future[Done] =
    MarketReportingEventHandler.handle(repository)(envelope.event).map(_ => Done)
}

private[reports] object MarketReportingEventHandler {
  private val log = LoggerFactory.getLogger(getClass)

  def handle(fixtureMarkers: FixtureMarketRepository)(event: MarketEvent)(implicit ec: ExecutionContext): Future[Unit] =
    event match {
      case Events.MarketCreated(marketId, _, info, selectionOdds, _) =>
        for {
          _ <- fixtureMarkers.upsert(Market(marketId, info.name, info.fixtureId))
          _ <- fixtureMarkers.upsert(
            selectionOdds.map(selection => MarketSelection(selection.selectionId, selection.selectionName, marketId)))
        } yield ()

      case Events.MarketOddsChanged(marketId, selectionOdds, _) =>
        fixtureMarkers.upsert(
          selectionOdds.map(selection => MarketSelection(selection.selectionId, selection.selectionName, marketId)))

      case Events.MarketInfoChanged(marketId, info, _) =>
        fixtureMarkers.upsert(Market(marketId, info.name, info.fixtureId))

      case otherEvent =>
        Future.successful(log.info("Received {}", otherEvent))
    }
}
