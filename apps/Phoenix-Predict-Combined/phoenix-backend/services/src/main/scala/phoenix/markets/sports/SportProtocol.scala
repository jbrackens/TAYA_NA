package phoenix.markets.sports

import java.time.OffsetDateTime

import akka.actor.typed.ActorRef

import phoenix.markets.MarketsBoundedContext.Sport
import phoenix.markets.infrastructure.MarketsSportsAkkaSerializable
import phoenix.markets.sports.SportEntity.FixtureId
import phoenix.markets.sports.SportEntity.SportId
import phoenix.markets.sports.SportEntity.TournamentId
import phoenix.markets.sports.SportProtocol.Responses.SportResponse

object SportProtocol {

  object Commands {

    sealed trait SportCommand extends MarketsSportsAkkaSerializable {
      val sportId: SportId
      val replyTo: ActorRef[SportResponse]
    }

    trait CanUpdateTournament {
      val tournamentId: TournamentId
      val tournamentName: String
      val tournamentStartTime: OffsetDateTime
    }

    final case class UpdateSport(
        correlationId: String,
        receivedAtUtc: OffsetDateTime,
        sportId: SportId,
        sportName: String,
        sportAbbreviation: String,
        displayToPunters: Option[Boolean],
        replyTo: ActorRef[SportResponse])
        extends SportCommand

    final case class UpdateTournament(
        correlationId: String,
        receivedAtUtc: OffsetDateTime,
        sportId: SportId,
        tournamentId: TournamentId,
        tournamentName: String,
        tournamentStartTime: OffsetDateTime,
        replyTo: ActorRef[SportResponse])
        extends SportCommand
        with CanUpdateTournament

    final case class UpdateFixture(
        correlationId: String,
        receivedAtUtc: OffsetDateTime,
        sportId: SportId,
        sportName: String,
        sportAbbreviation: String,
        tournamentId: TournamentId,
        tournamentName: String,
        tournamentStartTime: OffsetDateTime,
        fixtureId: FixtureId,
        fixtureName: String,
        startTime: OffsetDateTime,
        competitors: Set[Competitor],
        currentScore: Option[FixtureScore],
        fixtureStatus: FixtureLifecycleStatus,
        replyTo: ActorRef[SportResponse])
        extends SportCommand
        with CanUpdateTournament

    final case class UpdateFixtureInfo(
        correlationId: String,
        receivedAtUtc: OffsetDateTime,
        sportId: SportId,
        fixtureId: FixtureId,
        fixtureName: Option[String],
        fixtureLifecycleStatus: Option[FixtureLifecycleStatus],
        fixtureStartTime: Option[OffsetDateTime],
        fixtureUpdatedAt: OffsetDateTime,
        replyTo: ActorRef[SportResponse])
        extends SportCommand

    final case class MatchScore(home: Int, away: Int)

    final case class UpdateMatchStatus(
        correlationId: String,
        receivedAtUtc: OffsetDateTime,
        sportId: SportId,
        score: Option[MatchScore],
        fixtureId: FixtureId,
        matchPhase: FixtureLifecycleStatus,
        replyTo: ActorRef[SportResponse])
        extends SportCommand

  }

  object Responses {

    sealed trait SportResponse extends MarketsSportsAkkaSerializable

    final case class UpdateSportResponse(sportId: SportId) extends SportResponse

    final case class UpdateTournamentResponse(sportId: SportId, tournamentId: TournamentId) extends SportResponse

    final case class UpdateFixtureResponse(sportId: SportId, tournamentId: TournamentId, fixtureId: FixtureId)
        extends SportResponse

    final case class UnhandledCommandResponse(sportId: SportId) extends SportResponse

    final case class SportNotInitialized(sportId: SportId) extends SportResponse

    final case class FixtureNotFound(sportId: SportId, fixtureId: FixtureId) extends SportResponse
  }

  object Events {

    sealed trait SportEvent extends MarketsSportsAkkaSerializable

    sealed trait FixtureEvent {
      val sportId: SportId
      val fixtureId: FixtureId
    }

    final case class SportCreated(sport: Sport, createdAt: OffsetDateTime) extends SportEvent

    final case class SportUpdated(sport: Sport, updatedAt: OffsetDateTime) extends SportEvent

    final case class TournamentCreated(sportId: SportId, tournament: Tournament, createdAt: OffsetDateTime)
        extends SportEvent

    final case class TournamentUpdated(sportId: SportId, tournament: Tournament, updatedAt: OffsetDateTime)
        extends SportEvent

    final case class FixtureCreated(sportId: SportId, fixture: Fixture, createdAt: OffsetDateTime) extends SportEvent

    final case class FixtureStateChanged(fixture: Fixture, updatedAt: OffsetDateTime)
        extends SportEvent
        with FixtureEvent {
      val sportId: SportId = fixture.sportId
      val fixtureId: FixtureId = fixture.fixtureId
    }

    final case class FixtureStatusChanged(
        sportId: SportId,
        fixtureId: FixtureId,
        lifecycleStatus: FixtureLifecycleStatus,
        updatedAt: OffsetDateTime)
        extends SportEvent
        with FixtureEvent

    final case class FixtureInfoChanged(
        sportId: SportId,
        fixtureId: FixtureId,
        name: String,
        startTime: OffsetDateTime,
        competitors: Set[Competitor],
        updatedAt: OffsetDateTime)
        extends SportEvent
        with FixtureEvent

    final case class FixtureScoreChanged(
        sportId: SportId,
        fixtureId: FixtureId,
        currentScore: FixtureScore,
        updatedAt: OffsetDateTime)
        extends SportEvent
        with FixtureEvent
  }
}
