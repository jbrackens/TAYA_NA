package phoenix.markets.sports

import scala.concurrent.ExecutionContext

import akka.actor.testkit.typed.scaladsl.ScalaTestWithActorTestKit
import akka.persistence.testkit.scaladsl.EventSourcedBehaviorTestKit
import cats.syntax.apply._
import org.scalatest.wordspec.AnyWordSpecLike

import phoenix.core.Clock
import phoenix.core.domain.DataProvider
import phoenix.markets.FiltersConfig
import phoenix.markets.MarketsBoundedContext.Sport
import phoenix.markets.sports.SportEntity.FixtureId
import phoenix.markets.sports.SportEntity.SportId
import phoenix.markets.sports.SportProtocol.Commands.MatchScore
import phoenix.markets.sports.SportProtocol.Commands.SportCommand
import phoenix.markets.sports.SportProtocol.Commands.UpdateFixture
import phoenix.markets.sports.SportProtocol.Commands.UpdateMatchStatus
import phoenix.markets.sports.SportProtocol.Commands.UpdateSport
import phoenix.markets.sports.SportProtocol.Events._
import phoenix.support.DataGenerator._
import phoenix.support.TestUtils
import phoenix.time.FakeHardcodedClock

class SportEntitySpec
    extends ScalaTestWithActorTestKit(TestUtils.eventSourcedBehaviorTestKitConfig)
    with AnyWordSpecLike {
  import SportEntitySpec._

  implicit val ec: ExecutionContext = system.executionContext

  val clock: Clock = new FakeHardcodedClock

  def buildUpdateSportCommand(): UpdateSport = {
    val sportId = generateSportId()
    val correlationId = generateIdentifier()
    val receivedAtUtc = clock.currentOffsetDateTime()
    val sportName = generateSportName()
    val sportAbbreviation = sportName.substring(0, 2)
    val replyTo = createTestProbe().ref

    UpdateSport(correlationId, receivedAtUtc, sportId, sportName, sportAbbreviation, displayToPunters = None, replyTo)
  }

  def buildUpdateFixtureCommand(): UpdateFixture = {
    val correlationId = generateIdentifier()
    val receivedAtUtc = clock.currentOffsetDateTime()
    val sportId = generateSportId()
    val sportName = generateSportName()
    val sportAbbreviation = sportName.substring(0, 2)
    val tournamentId = generateTournamentId()
    val tournamentName = generateTournamentName()
    val tournamentStartTime = clock.currentOffsetDateTime()
    val fixtureId = generateFixtureId()
    val fixtureName = generateFixtureName()
    val startTime = clock.currentOffsetDateTime()
    val competitors = generateFixtureCompetitorsForTwoWayMarket()
    val currentScore = generateFixtureScore()
    val fixtureStatus = randomFixtureLifecycleStatus()
    val replyTo = createTestProbe().ref

    UpdateFixture(
      correlationId,
      receivedAtUtc,
      sportId,
      sportName,
      sportAbbreviation,
      tournamentId,
      tournamentName,
      tournamentStartTime,
      fixtureId,
      fixtureName,
      startTime,
      competitors,
      Some(currentScore),
      fixtureStatus,
      replyTo)
  }

  def buildUpdateMatchStatus(initialFixture: Option[UpdateFixture] = None): UpdateMatchStatus = {
    UpdateMatchStatus(
      correlationId = generateIdentifier(),
      receivedAtUtc = clock.currentOffsetDateTime(),
      sportId = generateSportId(),
      score = (initialFixture.flatMap(_.currentScore.map(_.home)), initialFixture.flatMap(_.currentScore.map(_.away)))
        .mapN { (homeScore, awayScore) =>
          MatchScore(homeScore, awayScore)
        }
        .orElse(Some(MatchScore(generateFixtureScore().home, generateFixtureScore().away))),
      fixtureId = initialFixture.map(_.fixtureId).getOrElse(FixtureId(DataProvider.Oddin, generateFixtureName())),
      matchPhase = initialFixture.map(_.fixtureStatus).getOrElse(randomFixtureLifecycleStatus()),
      replyTo = createTestProbe().ref)
  }

  def withSport(sportId: SportId)(f: EventSourcedBehaviorTestKit[SportCommand, SportEvent, SportState] => Any): Unit = {
    val sport =
      EventSourcedBehaviorTestKit[SportCommand, SportEvent, SportState](
        system,
        SportEntity(sportId, filtersConfig, clock))
    f(sport)
  }

  "A Sport" should {

    "initialize from a sport update" in {
      val sportId = randomElement(hiddenSportIds)
      withSport(sportId) { sport =>
        // Given
        val command = buildUpdateSportCommand()

        // When
        val result = sport.runCommand(command)

        // Then
        result.event shouldBe SportCreated(
          Sport(sportId, command.sportName, command.sportAbbreviation, displayToPunters = false),
          clock.currentOffsetDateTime())
      }
    }

    "initialize from a fixture update" in {
      val sportId = randomElement(visibleSportIds)
      withSport(sportId) { sport =>
        // Given
        val command = buildUpdateFixtureCommand()

        // When
        val result = sport.runCommand(command)

        // Then
        val sportCreated =
          SportCreated(
            Sport(sportId, command.sportName, command.sportAbbreviation, displayToPunters = true),
            clock.currentOffsetDateTime())
        val tournamentCreated = TournamentCreated(
          sportId,
          Tournament(command.tournamentId, command.tournamentName, command.tournamentStartTime),
          clock.currentOffsetDateTime())
        val fixtureCreated = FixtureCreated(
          sportId,
          Fixture(
            sportId,
            command.tournamentId,
            command.fixtureId,
            command.fixtureName,
            command.startTime,
            command.currentScore.get,
            command.fixtureStatus,
            command.competitors),
          clock.currentOffsetDateTime())

        result.events should contain only (sportCreated, tournamentCreated, fixtureCreated)
      }
    }

    "clean up old fixtures when a fixture is created" in {
      val sportId = randomElement(visibleSportIds)
      val now = clock.currentOffsetDateTime()
      withSport(sportId) { sport =>
        // Given
        val commandOldFixture = buildUpdateFixtureCommand().copy(startTime = now.minusDays(31))
        val commandFixture = buildUpdateFixtureCommand().copy(startTime = now)

        // When
        sport.runCommand(commandOldFixture)
        val result = sport.runCommand(commandFixture)

        // Then
        result.state shouldBe a[Available]
        result.state.asInstanceOf[Available].fixtures should have size 1
        result.state.asInstanceOf[Available].fixtures.head.fixtureId shouldBe commandFixture.fixtureId
      }
    }

    "update when a fixture update is received" in {
      val sportId = randomElement(allSportIds)
      withSport(sportId) { sport =>
        // Given
        val initializeCommand = buildUpdateFixtureCommand()
          .copy(fixtureStatus = FixtureLifecycleStatus.PreGame, currentScore = Some(FixtureScore(1, 2)))

        sport.runCommand(initializeCommand)

        // When
        val newStatus = FixtureLifecycleStatus.InPlay
        val newName = generateFixtureName()
        val newScore = FixtureScore(3, 4)
        val newStartTime = clock.currentOffsetDateTime().plusDays(5)
        val updateCommand =
          initializeCommand.copy(
            fixtureName = newName,
            fixtureStatus = newStatus,
            currentScore = Some(newScore),
            startTime = newStartTime)
        val result = sport.runCommand(updateCommand)
        val updatedAt = clock.currentOffsetDateTime()

        // Then
        result.events should contain only (FixtureStatusChanged(sportId, updateCommand.fixtureId, newStatus, updatedAt),
        FixtureScoreChanged(sportId, updateCommand.fixtureId, newScore, updatedAt),
        FixtureInfoChanged(
          sportId,
          updateCommand.fixtureId,
          newName,
          newStartTime,
          updateCommand.competitors,
          updatedAt),
        FixtureStateChanged(
          Fixture(
            sportId,
            updateCommand.tournamentId,
            updateCommand.fixtureId,
            newName,
            newStartTime,
            newScore,
            newStatus,
            updateCommand.competitors),
          updatedAt))
      }
    }

    "update with FixtureStatusChange when a UpdateMatchStatus with fixture status change is received" in {
      val sportId = randomElement(allSportIds)
      withSport(sportId) { sport =>
        // Given
        val initializeCommand = buildUpdateFixtureCommand()
          .copy(fixtureStatus = FixtureLifecycleStatus.PreGame, currentScore = Some(FixtureScore(1, 2)))

        sport.runCommand(initializeCommand)

        // When
        val updateCommand =
          buildUpdateMatchStatus(Some(initializeCommand)).copy(matchPhase = FixtureLifecycleStatus.InPlay)
        val result = sport.runCommand(updateCommand)
        val updatedAt = clock.currentOffsetDateTime()

        // Then
        result.events should contain only (FixtureStatusChanged(
          sportId,
          updateCommand.fixtureId,
          FixtureLifecycleStatus.InPlay,
          updatedAt),
        FixtureStateChanged(
          Fixture(
            sportId,
            initializeCommand.tournamentId,
            initializeCommand.fixtureId,
            initializeCommand.fixtureName,
            initializeCommand.startTime,
            initializeCommand.currentScore.get,
            FixtureLifecycleStatus.InPlay,
            initializeCommand.competitors),
          updatedAt))
      }
    }

    "update with FixtureScoreChanged when a UpdateMatchStatus with fixture score change is received" in {
      val sportId = randomElement(allSportIds)
      withSport(sportId) { sport =>
        // Given
        val initializeCommand = buildUpdateFixtureCommand()
          .copy(fixtureStatus = FixtureLifecycleStatus.PreGame, currentScore = Some(FixtureScore(1, 2)))

        sport.runCommand(initializeCommand)

        // When
        val updateCommand = buildUpdateMatchStatus(Some(initializeCommand))
        val updateCommandWithScore = updateCommand.copy(score = Some(MatchScore(updateCommand.score.get.home, 3)))
        val result = sport.runCommand(updateCommandWithScore)
        val updatedAt = clock.currentOffsetDateTime()
        val newScore = FixtureScore(updateCommand.score.get.home, away = 3)

        // Then
        result.events should contain only (FixtureScoreChanged(sportId, updateCommand.fixtureId, newScore, updatedAt),
        FixtureStateChanged(
          Fixture(
            sportId,
            initializeCommand.tournamentId,
            initializeCommand.fixtureId,
            initializeCommand.fixtureName,
            initializeCommand.startTime,
            newScore,
            FixtureLifecycleStatus.PreGame,
            initializeCommand.competitors),
          updatedAt))
      }

    }

  }
}

object SportEntitySpec {

  val hiddenSportIds: Seq[SportId] = Seq("s:p:4", "s:p:7", "s:p:14").map(SportId.unsafeParse(_))
  val visibleSportIds: Seq[SportId] =
    Seq("s:p:1", "s:p:2", "s:p:3", "s:p:10", "s:p:11").map(SportId.unsafeParse(_))
  val allSportIds: Seq[SportId] = hiddenSportIds ++ visibleSportIds

  val filtersConfig: FiltersConfig = FiltersConfig(visibleSportIds, Seq(), false)
}
