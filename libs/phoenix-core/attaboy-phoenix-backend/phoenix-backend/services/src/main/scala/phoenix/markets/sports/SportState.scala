package phoenix.markets.sports

import java.time.OffsetDateTime

import enumeratum.EnumEntry.UpperSnakecase
import enumeratum._

import phoenix.core.Clock
import phoenix.dataapi.shared.FixtureStatus
import phoenix.markets.MarketsBoundedContext.FixtureStateUpdate
import phoenix.markets.infrastructure.MarketsSportsAkkaSerializable
import phoenix.markets.sports.SportEntity.CompetitorId
import phoenix.markets.sports.SportEntity.FixtureId
import phoenix.markets.sports.SportEntity.SportId
import phoenix.markets.sports.SportEntity.TournamentId

final case class Competitor(id: CompetitorId, name: String, qualifier: String)

final case class Fixture(
    sportId: SportId,
    tournamentId: TournamentId,
    fixtureId: FixtureId,
    name: String,
    startTime: OffsetDateTime,
    currentScore: FixtureScore,
    fixtureLifecycleStatus: FixtureLifecycleStatus,
    competitors: Set[Competitor]) {

  def toFixtureStateUpdate: FixtureStateUpdate =
    FixtureStateUpdate(fixtureId, name, startTime, fixtureLifecycleStatus, currentScore)
}

final case class Tournament(tournamentId: TournamentId, name: String, startTime: OffsetDateTime)

final case class FixtureScore(home: Int, away: Int)

object FixtureScore {
  val NilScore: FixtureScore = FixtureScore(0, 0)
}

sealed trait FixtureLifecycleStatus extends EnumEntry with UpperSnakecase

object FixtureLifecycleStatus extends Enum[FixtureLifecycleStatus] {
  override def values = findValues

  case object PreGame extends FixtureLifecycleStatus

  case object Postponed extends FixtureLifecycleStatus

  case object InPlay extends FixtureLifecycleStatus

  case object PostGame extends FixtureLifecycleStatus

  case object GameAbandoned extends FixtureLifecycleStatus

  case object BreakInPlay extends FixtureLifecycleStatus

  case object Unknown extends FixtureLifecycleStatus

  /** Helper for issue with Enum UpperSnakecase lack of 1==1 mapping */
  def fromSharedFixtureStatus(status: FixtureStatus): FixtureLifecycleStatus =
    status.name() match {
      case "PreGame"       => PreGame
      case "Postponed"     => Postponed
      case "InPlay"        => InPlay
      case "PostGame"      => PostGame
      case "GameAbandoned" => GameAbandoned
      case "BreakInPlay"   => BreakInPlay
      case _               => Unknown
    }
}

sealed trait SportState extends MarketsSportsAkkaSerializable

final case object Uninitialized extends SportState {

  def available(name: String, abbreviation: String, displayToPunters: Boolean): Available =
    Available(
      name = name,
      abbreviation = abbreviation,
      displayToPunters = displayToPunters,
      fixtures = Set.empty,
      tournaments = Set.empty)
}

final case class Available(
    name: String,
    abbreviation: String,
    displayToPunters: Boolean,
    fixtures: Set[Fixture],
    tournaments: Set[Tournament])
    extends SportState {

  def withName(name: String): Available =
    copy(name = name)

  def withAbbreviation(abbreviation: String): Available =
    copy(abbreviation = abbreviation)

  def withDisplayToPunters(displayToPunters: Boolean): Available =
    copy(displayToPunters = displayToPunters)

  def withTournament(tournament: Tournament): Available = {
    val newTournament = findTournament(tournament.tournamentId)
      .map { t => t.copy(name = tournament.name, startTime = tournament.startTime) }
      .getOrElse(tournament)
    val newTournaments = tournaments.filterNot(_.tournamentId == tournament.tournamentId) + newTournament
    copy(tournaments = newTournaments)
  }

  def withFixture(fixture: Fixture, clock: Clock): Available = {
    val days30ago = clock.currentOffsetDateTime().minusDays(30)
    val newState = replaceFixture(fixture)
    val fixturesWithoutOldOnes = newState.fixtures.filter(_.startTime.isAfter(days30ago))
    newState.copy(fixtures = fixturesWithoutOldOnes)
  }

  private def replaceFixture(newFixture: Fixture): Available = {
    val newFixtures = fixtures.filterNot(_.fixtureId == newFixture.fixtureId) + newFixture
    copy(fixtures = newFixtures)
  }

  def updateTournament(tournamentId: TournamentId, action: Tournament => Tournament): Available =
    findTournament(tournamentId) match {
      case Some(tournament) => withTournament(action(tournament))
      case None             => this
    }

  def withFixtureStatus(fixtureId: FixtureId, newStatus: FixtureLifecycleStatus): Available =
    updateFixture(
      fixtureId,
      existingFixture => replaceFixture(existingFixture.copy(fixtureLifecycleStatus = newStatus)))

  def withFixtureScores(fixtureId: FixtureId, newScore: FixtureScore): Available =
    updateFixture(fixtureId, existingFixture => replaceFixture(existingFixture.copy(currentScore = newScore)))

  def withFixtureInfo(fixtureId: FixtureId, newName: String, newStartTime: OffsetDateTime): Available =
    updateFixture(
      fixtureId,
      existingFixture => replaceFixture(existingFixture.copy(name = newName, startTime = newStartTime)))

  def findTournament(tournamentId: TournamentId): Option[Tournament] =
    tournaments.find(_.tournamentId == tournamentId)

  def findFixture(fixtureId: FixtureId): Option[Fixture] =
    fixtures.find(_.fixtureId == fixtureId)

  private def updateFixture(fixtureId: FixtureId, action: Fixture => Available): Available =
    findFixture(fixtureId) match {
      case Some(fixture) => action(fixture)
      case None          => this
    }

}

object SportState {
  def apply(): SportState = Uninitialized
}
