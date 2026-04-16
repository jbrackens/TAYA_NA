package phoenix.markets.sports

import scala.concurrent.Future

import akka.Done
import akka.actor.typed.ActorSystem
import akka.projection.eventsourced.EventEnvelope
import org.slf4j.LoggerFactory

import phoenix.markets.MarketsBoundedContext
import phoenix.markets.MarketsBoundedContext.Sport
import phoenix.markets.MarketsRepository
import phoenix.markets.sports.SportProtocol.Events.SportCreated
import phoenix.markets.sports.SportProtocol.Events.SportEvent
import phoenix.markets.sports.SportProtocol.Events.SportUpdated
import phoenix.markets.sports.SportProtocol.Events.TournamentCreated
import phoenix.markets.sports.SportProtocol.Events.TournamentUpdated
import phoenix.projections.ProjectionEventHandler

class SportsProjectionHandler(system: ActorSystem[_], repository: MarketsRepository)
    extends ProjectionEventHandler[SportEvent] {
  private val log = LoggerFactory.getLogger(getClass)

  implicit val ec = system.executionContext

  override def process(envelope: EventEnvelope[SportEvent]): Future[Done] = {
    log.info("handling SportEvent (sport & tournament) - {}", envelope.event)

    envelope.event match {
      case SportCreated(sport, _) =>
        repository.saveSport(Sport(sport.sportId, sport.name, sport.abbreviation, sport.displayToPunters))

      case SportUpdated(sport, _) =>
        repository.saveSport(Sport(sport.sportId, sport.name, sport.abbreviation, sport.displayToPunters))

      case TournamentCreated(sportId, tournament, _) =>
        repository.saveTournament(
          MarketsBoundedContext.Tournament(tournament.tournamentId, sportId, tournament.name, tournament.startTime))

      case TournamentUpdated(sportId, tournament, _) =>
        repository.saveTournament(
          MarketsBoundedContext.Tournament(tournament.tournamentId, sportId, tournament.name, tournament.startTime))

      case otherEvent =>
        log.info("Sports projection handler ignoring {}", otherEvent)
        Future.successful(Done)
    }
  }
}
