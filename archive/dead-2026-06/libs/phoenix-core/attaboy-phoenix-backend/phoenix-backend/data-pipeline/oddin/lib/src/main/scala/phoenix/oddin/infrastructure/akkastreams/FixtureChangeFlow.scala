package phoenix.oddin.infrastructure.akkastreams

import akka.actor.typed.ActorSystem
import akka.stream.scaladsl.Flow
import akka.stream.scaladsl.Source
import org.slf4j.LoggerFactory

import phoenix.core.TimeUtils._
import phoenix.dataapi.internal.oddin
import phoenix.dataapi.internal.oddin.FixtureChangedEvent
import phoenix.dataapi.internal.oddin.MatchScore
import phoenix.oddin.domain.Competitor
import phoenix.oddin.domain.MatchSummary
import phoenix.oddin.domain.OddinRestApi
import phoenix.oddin.domain.OddinStreamingApi.FixtureChangeFlow
import phoenix.oddin.domain.OddinStreamingApi.FixtureChangeMessage

object FixtureChangeFlow {
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
      matchSummary: MatchSummary): FixtureChangedEvent = {
    FixtureChangedEvent(
      fixtureChange.correlationId.value.toString,
      fixtureChange.receivedAt.value.toEpochMilli,
      matchSummary.sportEvent.sport.id.value,
      matchSummary.sportEvent.sport.name.value,
      matchSummary.sportEvent.sport.abbreviation.value,
      matchSummary.sportEvent.tournament.id.value,
      matchSummary.sportEvent.tournament.name.value,
      matchSummary.sportEvent.tournament.startTime.value.toEpochMilli,
      fixtureChange.payload.sportEventId.value,
      matchSummary.sportEvent.name.value,
      matchSummary.sportEvent.startTime.value.toEpochMilli,
      matchSummary.status.state.entryName,
      matchSummary.sportEvent.competitors.map(toCompetitor),
      MatchScore(matchSummary.status.homeScore.value, matchSummary.status.awayScore.value))
  }

  private def toCompetitor(competitor: Competitor): oddin.Competitor =
    oddin.Competitor(competitor.id.value, competitor.name.value, competitor.side.entryName)
}
