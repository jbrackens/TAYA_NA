package phoenix.reports.application.es

import scala.concurrent.ExecutionContext
import scala.concurrent.Future

import akka.Done
import akka.projection.eventsourced.EventEnvelope
import org.slf4j.LoggerFactory

import phoenix.markets.sports.SportProtocol.Events.FixtureCreated
import phoenix.markets.sports.SportProtocol.Events.FixtureInfoChanged
import phoenix.markets.sports.SportProtocol.Events.SportEvent
import phoenix.projections.ProjectionEventHandler
import phoenix.reports.domain.FixtureMarketRepository
import phoenix.reports.domain.model.markets.Fixture

final class FixtureReportingEventHandler(repository: FixtureMarketRepository)(implicit ec: ExecutionContext)
    extends ProjectionEventHandler[SportEvent] {

  override def process(envelope: EventEnvelope[SportEvent]): Future[Done] =
    FixtureReportingEventHandler.handle(repository)(envelope.event).map(_ => Done)
}

private[reports] object FixtureReportingEventHandler {
  private val log = LoggerFactory.getLogger(getClass)

  def handle(fixtureMarkets: FixtureMarketRepository)(event: SportEvent): Future[Unit] =
    event match {
      case FixtureCreated(_, fixture, _) =>
        fixtureMarkets.upsert(Fixture(fixture.fixtureId, fixture.name, fixture.startTime))

      case FixtureInfoChanged(_, fixtureId, name, startTime, _, _) =>
        fixtureMarkets.upsert(Fixture(fixtureId, name, startTime))

      case otherEvent =>
        Future.successful(log.info("Received {}", otherEvent))
    }
}
