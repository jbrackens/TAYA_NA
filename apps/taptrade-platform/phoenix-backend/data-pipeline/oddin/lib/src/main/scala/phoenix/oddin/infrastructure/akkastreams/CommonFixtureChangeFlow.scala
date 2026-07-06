package phoenix.oddin.infrastructure.akkastreams

import akka.actor.typed.ActorSystem
import akka.stream.scaladsl.Flow
import akka.stream.scaladsl.Source
import org.slf4j.LoggerFactory

import phoenix.core.TimeUtils._
import phoenix.dataapi.shared
import phoenix.dataapi.shared._
import phoenix.oddin.domain
import phoenix.oddin.domain.CommonOddinStreamingApi.FixtureChangeFlow
import phoenix.oddin.domain.Competitor
import phoenix.oddin.domain.MatchSummary
import phoenix.oddin.domain.OddinRestApi
import phoenix.oddin.domain.OddinStreamingApi.FixtureChangeMessage
import phoenix.oddin.domain.SportEventState

object CommonFixtureChangeFlow {
  private val log = LoggerFactory.getLogger(getClass)

  def apply(oddinRestApi: OddinRestApi, fixtureChangeParallelism: Int)(implicit
      system: ActorSystem[_]): FixtureChangeFlow = {
    implicit val ec = system.executionContext

    Flow[FixtureChangeMessage]
      .mapAsync(fixtureChangeParallelism) { fixtureChange =>
        oddinRestApi
          .getMatchSummary(fixtureChange.payload.sportEventId)
          .map(matchSummary => buildFixtureChangedEvent(fixtureChange, matchSummary))
          .value
      }
      .flatMapConcat {
        case Right(value) => Source.single(value)
        case Left(error) =>
          log.error(s"Failed to retrieve match summary '$error'")
          Source.empty
      }
  }

  private def buildFixtureChangedEvent(
      fixtureChange: FixtureChangeMessage,
      matchSummary: MatchSummary): shared.FixtureChange = {
    shared.FixtureChange(
      header = Header(fixtureChange.correlationId.value.toString, fixtureChange.receivedAt.value.toInstant, "oddin"),
      namespacedId = fixtureChange.payload.sportEventId.namespacedPhoenixFixtureId.value,
      name = matchSummary.sportEvent.name.value,
      startTimeUtc = matchSummary.sportEvent.startTime.value.toEpochMilli,
      status = toFixtureStatus(matchSummary.status.state),
      sport = Sport(
        matchSummary.sportEvent.sport.id.namespacedPhoenixSportId.value,
        matchSummary.sportEvent.sport.name.value,
        matchSummary.sportEvent.sport.abbreviation.value),
      competition = Competition(
        matchSummary.sportEvent.tournament.id.namespacedPhoenixTournamentId.value,
        matchSummary.sportEvent.tournament.name.value),
      competitors = matchSummary.sportEvent.competitors.map(toCompetitor))
  }

  private def toCompetitor(competitor: Competitor): shared.Competitor =
    shared.Competitor(
      competitor.id.namespacedPhoenixFixtureId.value,
      competitor.name.value,
      toCompetitorSide(competitor.side))

  private def toCompetitorSide: domain.CompetitorSide => shared.CompetitorSide = {
    case domain.CompetitorSide.Home => shared.CompetitorSide.Home
    case domain.CompetitorSide.Away => shared.CompetitorSide.Away
  }

  private def toFixtureStatus(state: SportEventState): FixtureStatus =
    state match {
      case SportEventState.NotStarted | SportEventState.Delayed                       => FixtureStatus.PreGame
      case SportEventState.Postponed                                                  => FixtureStatus.Postponed
      case SportEventState.Live | SportEventState.Started                             => FixtureStatus.InPlay
      case SportEventState.Suspended | SportEventState.Interrupted                    => FixtureStatus.BreakInPlay
      case SportEventState.Ended | SportEventState.Finalized | SportEventState.Closed => FixtureStatus.PostGame
      case SportEventState.Cancelled | SportEventState.Abandoned                      => FixtureStatus.GameAbandoned
    }

}
