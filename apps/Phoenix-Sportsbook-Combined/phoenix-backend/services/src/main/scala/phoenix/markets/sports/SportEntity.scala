package phoenix.markets.sports

import java.time.OffsetDateTime

import akka.actor.typed.Behavior
import akka.actor.typed.SupervisorStrategy
import akka.actor.typed.scaladsl.Behaviors
import akka.persistence.typed.scaladsl.Effect
import akka.persistence.typed.scaladsl.EventSourcedBehavior
import akka.persistence.typed.scaladsl.ReplyEffect
import io.scalaland.chimney.dsl._
import org.slf4j.LoggerFactory

import phoenix.core.Clock
import phoenix.core.OptionUtils._
import phoenix.core.ScalaObjectUtils.ScalaObjectOps
import phoenix.core.SeqUtils._
import phoenix.core.domain.DataProvider
import phoenix.core.domain.EntityType
import phoenix.core.domain.NamespacedPhoenixId
import phoenix.markets.FiltersConfig
import phoenix.markets.MarketsBoundedContext.Sport
import phoenix.markets.sports.SportEntity.SportId
import phoenix.markets.sports.SportProtocol.Commands._
import phoenix.markets.sports.SportProtocol.Events._
import phoenix.markets.sports.SportProtocol.Responses._
import phoenix.sharding.PhoenixAkkaId
import phoenix.sharding.PhoenixId
import phoenix.sharding.PhoenixPersistenceId
import phoenix.sharding.ProjectionTags.ProjectionTag
import phoenix.utils.EventSourcedBehaviourConfiguration.enrichWithCommonPersistenceConfiguration

object SportEntity {
  private val log = LoggerFactory.getLogger(this.objectName)

  final case class SportId(provider: DataProvider, id: String) extends PhoenixId with NamespacedPhoenixId {
    override val entityType: EntityType = EntityType.Sport
  }
  object SportId {
    def unsafeParse(namespaced: String) = NamespacedPhoenixId.unsafeParse(SportId.apply)(namespaced)
    def parse(namespaced: String) = NamespacedPhoenixId.parse(SportId.apply)(namespaced)
  }

  final case class TournamentId(provider: DataProvider, id: String) extends PhoenixId with NamespacedPhoenixId {
    override val entityType: EntityType = EntityType.Tournament
  }
  object TournamentId {
    def unsafeParse(namespaced: String) = NamespacedPhoenixId.unsafeParse(TournamentId.apply)(namespaced)
    def parse(namespaced: String) = NamespacedPhoenixId.parse(TournamentId.apply)(namespaced)
  }

  final case class FixtureId(provider: DataProvider, id: String) extends PhoenixAkkaId with NamespacedPhoenixId {
    override val entityType: EntityType = EntityType.Fixture
  }
  object FixtureId {
    def unsafeParse(namespaced: String) = NamespacedPhoenixId.unsafeParse(FixtureId.apply)(namespaced)
    def parse(namespaced: String) = NamespacedPhoenixId.parse(FixtureId.apply)(namespaced)
  }
  final case class CompetitorId(provider: DataProvider, id: String) extends PhoenixId with NamespacedPhoenixId {
    override val entityType: EntityType = EntityType.Competitor
  }
  object CompetitorId {
    def unsafeParse(namespaced: String) = NamespacedPhoenixId.unsafeParse(CompetitorId.apply)(namespaced)
    def parse(namespaced: String) = NamespacedPhoenixId.parse(CompetitorId.apply)(namespaced)
  }

  def apply(sportId: SportId, filtersConfig: FiltersConfig, clock: Clock): Behavior[SportCommand] = {
    Behaviors.setup[SportCommand] { _ =>
      log.info("Starting Sport entity with sportId {}", sportId)
      Behaviors
        .supervise(enrichWithCommonPersistenceConfiguration {
          EventSourcedBehavior
            .withEnforcedReplies[SportCommand, SportEvent, SportState](
              persistenceId = PhoenixPersistenceId.of(SportsShardingRegion.TypeKey, sportId),
              emptyState = SportState(),
              commandHandler = SportCommandHandler(sportId, filtersConfig, clock),
              eventHandler = SportEventHandler(clock))
            .withTagger(_ =>
              Set(ProjectionTag.from(sportId, SportTags.sportTags).value, SportTags.allSportEventsNotSharded.value))
        })
        .onFailure[IllegalStateException](SupervisorStrategy.resume)
    }
  }
}

private object SportCommandHandler {
  private val log = LoggerFactory.getLogger(getClass)

  type CommandHandler = (SportState, SportCommand) => ReplyEffect[SportEvent, SportState]

  def apply(sportId: SportId, filtersConfig: FiltersConfig, clock: Clock): CommandHandler = {
    case (Uninitialized, command: UpdateSport)              => createSport(sportId, filtersConfig, command, clock)
    case (Uninitialized, command: UpdateFixture)            => createFixture(sportId, filtersConfig, command, clock)
    case (Uninitialized, other)                             => sportNotInitialized(other)
    case (available: Available, command: UpdateSport)       => updateSport(sportId, available, command, clock)
    case (available: Available, command: UpdateTournament)  => updateTournament(sportId, available, command, clock)
    case (available: Available, command: UpdateFixture)     => updateFixture(sportId, available, command, clock)
    case (available: Available, command: UpdateFixtureInfo) => updateFixtureInfo(sportId, available, command, clock)
    case (available: Available, command: UpdateMatchStatus) => updateMatchStatus(sportId, available, command, clock)
    case (otherState, otherCommand)                         => unhandledCommand(sportId, otherState, otherCommand)
  }

  private def createSport(
      sportId: SportId,
      filtersConfig: FiltersConfig,
      command: UpdateSport,
      clock: Clock): ReplyEffect[SportEvent, SportState] = {
    log.info(s"createSport: $command")
    val displayToPunters =
      command.displayToPunters.getOrElse(filtersConfig.sportsDisplayedToPuntersByDefault.invariantContains(sportId))
    Effect
      .persist(
        SportCreated(
          Sport(sportId, command.sportName, command.sportAbbreviation, displayToPunters = displayToPunters),
          clock.currentOffsetDateTime()))
      .thenReply(command.replyTo)(_ => UpdateSportResponse(sportId))
  }

  private def updateSport(
      sportId: SportId,
      state: Available,
      command: UpdateSport,
      clock: Clock): ReplyEffect[SportEvent, SportState] = {
    log.info(s"updateSport: $command")
    val maybeSportUpdated =
      Option.when(sportHasChanged(state, command)) {
        SportUpdated(
          Sport(
            sportId,
            command.sportName,
            command.sportAbbreviation,
            displayToPunters = command.displayToPunters.getOrElse(state.displayToPunters)),
          clock.currentOffsetDateTime())
      }

    Effect.persist(maybeSportUpdated.toList).thenReply(command.replyTo)(_ => UpdateSportResponse(sportId))
  }

  private def getOrCreateTournamentAndEvent(
      sportId: SportId,
      state: Available,
      command: CanUpdateTournament,
      clock: Clock): (Tournament, Option[SportEvent]) =
    state.findTournament(command.tournamentId) match {
      case Some(tournament) if tournamentHasChanged(tournament, command) =>
        (
          tournament,
          Some(
            TournamentUpdated(
              sportId,
              Tournament(command.tournamentId, command.tournamentName, command.tournamentStartTime),
              clock.currentOffsetDateTime())))
      case Some(tournament) => (tournament, None)
      case None =>
        val tournament =
          Tournament(command.tournamentId, command.tournamentName, command.tournamentStartTime)
        (tournament, Some(TournamentCreated(sportId, tournament, clock.currentOffsetDateTime())))
    }

  private def updateTournament(
      sportId: SportId,
      available: Available,
      command: UpdateTournament,
      clock: Clock): ReplyEffect[SportEvent, SportState] = {
    val (_, event) = getOrCreateTournamentAndEvent(sportId, available, command, clock)

    Effect
      .persist(event.toList)
      .thenReply(command.replyTo)(_ => UpdateTournamentResponse(sportId, command.tournamentId))
  }

  private def createFixture(
      sportId: SportId,
      filtersConfig: FiltersConfig,
      command: UpdateFixture,
      clock: Clock): ReplyEffect[SportEvent, SportState] = {
    val sportCreated =
      SportCreated(
        Sport(
          sportId,
          command.sportName,
          command.sportAbbreviation,
          displayToPunters = filtersConfig.sportsDisplayedToPuntersByDefault.invariantContains(sportId)),
        clock.currentOffsetDateTime())
    val tournamentCreated =
      TournamentCreated(
        sportId,
        Tournament(command.tournamentId, command.tournamentName, command.tournamentStartTime),
        clock.currentOffsetDateTime())
    val fixtureCreated = FixtureCreated(sportId, toFixture(sportId, command, None), clock.currentOffsetDateTime())

    val events = List(sportCreated, tournamentCreated, fixtureCreated)

    Effect
      .persist(events)
      .thenReply(command.replyTo)(_ => UpdateFixtureResponse(sportId, command.tournamentId, command.fixtureId))
  }

  private def toFixture(sportId: SportId, command: UpdateFixture, maybeCurrentFixture: Option[Fixture]): Fixture =
    Fixture(
      sportId,
      command.tournamentId,
      command.fixtureId,
      command.fixtureName,
      command.startTime,
      command.currentScore.getOrElse(maybeCurrentFixture.map(_.currentScore).getOrElse(FixtureScore.NilScore)),
      command.fixtureStatus,
      command.competitors)

  private def updateFixture(
      sportId: SportId,
      available: Available,
      command: UpdateFixture,
      clock: Clock): ReplyEffect[SportEvent, SportState] = {
    log.info(s"updateFixture: $command")
    val (tournament, tournamentEvent) = getOrCreateTournamentAndEvent(sportId, available, command, clock)

    val fixtureEvents = available.findFixture(command.fixtureId) match {
      case Some(fixture) =>
        fixtureChangedEvents(fixture, command, clock)
      case None =>
        Seq(FixtureCreated(sportId, toFixture(sportId, command, None), clock.currentOffsetDateTime()))
    }

    val events = tournamentEvent.toList ++ fixtureEvents

    Effect
      .persist(events)
      .thenReply(command.replyTo)(_ => UpdateFixtureResponse(sportId, tournament.tournamentId, command.fixtureId))
  }

  private def updateFixtureInfo(
      sportId: SportId,
      available: Available,
      command: UpdateFixtureInfo,
      clock: Clock): ReplyEffect[SportEvent, SportState] = {
    log.info(s"updateFixtureInfo: $command")

    case class EventsWithResponse(events: Seq[SportEvent] = Seq.empty, response: SportResponse)

    val eventsWithResponse: EventsWithResponse = available.findFixture(command.fixtureId) match {
      case Some(fixture) =>
        EventsWithResponse(
          fixtureChangedInfoEvents(fixture, command, clock),
          UpdateFixtureResponse(sportId, fixture.tournamentId, command.fixtureId))
      case None => EventsWithResponse(response = FixtureNotFound(sportId, command.fixtureId))
    }
    Effect.persist(eventsWithResponse.events).thenReply(command.replyTo)(_ => eventsWithResponse.response)
  }

  private def updateMatchStatus(
      sportId: SportId,
      available: Available,
      command: UpdateMatchStatus,
      clock: Clock): ReplyEffect[SportEvent, SportState] = {

    case class EventsWithResponse(events: Seq[SportEvent] = Seq.empty, response: SportResponse)

    val eventsWithResponse: EventsWithResponse = available.findFixture(command.fixtureId) match {
      case Some(fixture) =>
        EventsWithResponse(
          fixtureChangedEventsMatchStatus(fixture, command, clock),
          UpdateFixtureResponse(sportId, fixture.tournamentId, command.fixtureId))
      case None =>
        EventsWithResponse(response = FixtureNotFound(sportId, command.fixtureId))
    }

    Effect.persist(eventsWithResponse.events).thenReply(command.replyTo)(_ => eventsWithResponse.response)
  }

  private def sportHasChanged(state: Available, command: UpdateSport): Boolean =
    state.name != command.sportName || state.abbreviation != command.sportAbbreviation ||
    command.displayToPunters.invariantContains(!state.displayToPunters)

  private def tournamentHasChanged(tournament: Tournament, command: CanUpdateTournament): Boolean =
    tournament.name != command.tournamentName

  private def fixtureChangedEventsMatchStatus(
      fixture: Fixture,
      command: UpdateMatchStatus,
      clock: Clock): Seq[SportEvent] = {
    val timestamp = clock.currentOffsetDateTime()

    val maybeFixtureStatusChanged = fixtureStatusChangedEvent(fixture, command.matchPhase, timestamp)

    val newScore = command.score.transformInto[Option[FixtureScore]]

    val maybeFixtureScoreChanged = newScore.flatMap(score => fixtureScoreChangedEvent(fixture, score, timestamp))

    val events = maybeFixtureStatusChanged.toList ++ maybeFixtureScoreChanged.toList

    events match {
      case Nil => events
      case list =>
        val newFixture = fixture.copy(
          currentScore = newScore.getOrElse(fixture.currentScore),
          fixtureLifecycleStatus = command.matchPhase,
          competitors = fixture.competitors)
        list :+ FixtureStateChanged(newFixture, timestamp)
    }
  }

  private def fixtureChangedEvents(fixture: Fixture, command: UpdateFixture, clock: Clock): Seq[SportEvent] = {
    val timestamp = clock.currentOffsetDateTime()

    val maybeFixtureStatusChanged = fixtureStatusChangedEvent(fixture, command.fixtureStatus, timestamp)

    val newScore = command.currentScore.getOrElse(fixture.currentScore)

    val maybeFixtureScoreChanged = fixtureScoreChangedEvent(fixture, newScore, timestamp)

    val maybeFixtureInfoChanged = if (fixtureInfoHasChanged(fixture, command)) {
      Some(
        FixtureInfoChanged(
          fixture.sportId,
          fixture.fixtureId,
          command.fixtureName,
          command.startTime,
          command.competitors,
          timestamp))
    } else None

    val events = maybeFixtureStatusChanged.toList ++ maybeFixtureScoreChanged.toList ++ maybeFixtureInfoChanged.toList

    events match {
      case Nil => events
      case list =>
        val newFixture = Fixture(
          fixture.sportId,
          fixture.tournamentId,
          fixture.fixtureId,
          command.fixtureName,
          command.startTime,
          newScore,
          command.fixtureStatus,
          fixture.competitors)
        list :+ FixtureStateChanged(newFixture, timestamp)
    }
  }

  private def fixtureChangedInfoEvents(fixture: Fixture, command: UpdateFixtureInfo, clock: Clock): Seq[SportEvent] = {
    val timestamp = clock.currentOffsetDateTime()

    val newName = command.fixtureName.getOrElse(fixture.name)
    val newStartTime = command.fixtureStartTime.getOrElse(fixture.startTime)
    val newStatus = command.fixtureLifecycleStatus.getOrElse(fixture.fixtureLifecycleStatus)

    val maybeFixtureStatusChanged =
      command.fixtureLifecycleStatus.flatMap(fixtureStatusChangedEvent(fixture, _, timestamp))

    val maybeFixtureInfoChanged = if (fixtureInfoHasChanged(fixture, command)) {
      Some(
        FixtureInfoChanged(fixture.sportId, fixture.fixtureId, newName, newStartTime, fixture.competitors, timestamp))
    } else None

    val events = maybeFixtureStatusChanged.toList ++ maybeFixtureInfoChanged.toList

    events match {
      case Nil => events
      case list =>
        val newFixture = Fixture(
          fixture.sportId,
          fixture.tournamentId,
          fixture.fixtureId,
          newName,
          newStartTime,
          fixture.currentScore,
          newStatus,
          fixture.competitors)
        list :+ FixtureStateChanged(newFixture, timestamp)
    }
  }

  private def fixtureScoreChangedEvent(
      fixture: Fixture,
      newScore: FixtureScore,
      timestamp: OffsetDateTime): Option[FixtureScoreChanged] = {
    if (newScore != fixture.currentScore) {
      Some(FixtureScoreChanged(fixture.sportId, fixture.fixtureId, newScore, timestamp))
    } else None
  }

  private def fixtureStatusChangedEvent(
      fixture: Fixture,
      newFixtureStatus: FixtureLifecycleStatus,
      timestamp: OffsetDateTime): Option[FixtureStatusChanged] = {
    if (fixture.fixtureLifecycleStatus != newFixtureStatus)
      Some(FixtureStatusChanged(fixture.sportId, fixture.fixtureId, newFixtureStatus, timestamp))
    else None
  }

  private def fixtureInfoHasChanged(fixture: Fixture, command: UpdateFixture): Boolean =
    fixture.name != command.fixtureName || fixture.startTime != command.startTime
  private def fixtureInfoHasChanged(fixture: Fixture, command: UpdateFixtureInfo): Boolean =
    command.fixtureName.exists(_ != fixture.name) || command.fixtureStartTime.exists(_ != fixture.startTime)

  private def sportNotInitialized(command: SportCommand): ReplyEffect[SportEvent, SportState] =
    Effect.reply[SportResponse, SportEvent, SportState](command.replyTo)(SportNotInitialized(command.sportId))

  private def unhandledCommand(
      sportId: SportId,
      state: SportState,
      command: SportCommand): ReplyEffect[SportEvent, SportState] = {
    log.warn(s"Ignoring sport command $command in state $state")
    Effect.reply(command.replyTo)(UnhandledCommandResponse(sportId))
  }
}

private object SportEventHandler {
  private val log = LoggerFactory.getLogger(this.objectName)

  type EventHandler = EventSourcedBehavior.EventHandler[SportState, SportEvent]

  def apply(clock: Clock): EventHandler =
    (state, event) =>
      state match {
        case Uninitialized    => whenUninitialized(event)
        case state: Available => whenAvailable(state, event, clock)
      }

  private def whenUninitialized(event: SportEvent): SportState =
    event match {
      case SportCreated(sport, _) => {
        log.info(s"whenUninitialized: SportCreated: $sport")
        Uninitialized.available(sport.name, sport.abbreviation, sport.displayToPunters)
      }
      case otherEvent => unexpectedEvent(Uninitialized, otherEvent)
    }

  private def whenAvailable(state: Available, event: SportEvent, clock: Clock): SportState =
    event match {
      case SportUpdated(sport, _) =>
        state.withName(sport.name).withAbbreviation(sport.abbreviation).withDisplayToPunters(sport.displayToPunters)
      case TournamentCreated(_, tournament, _) => state.withTournament(tournament)
      case TournamentUpdated(_, tournament, _) => state.withTournament(tournament)
      case FixtureCreated(_, fixture, _)       => state.withFixture(fixture, clock)
      case FixtureInfoChanged(_, fixtureId, name, startTime, _, _) =>
        state.withFixtureInfo(fixtureId, name, startTime)
      case FixtureStatusChanged(_, fixtureId, lifecycleStatus, _) =>
        state.withFixtureStatus(fixtureId, lifecycleStatus)
      case FixtureScoreChanged(_, fixtureId, currentScore, _) =>
        state.withFixtureScores(fixtureId, currentScore)
      case _: FixtureStateChanged => state
      case otherEvent             => unexpectedEvent(state, otherEvent)
    }

  private def unexpectedEvent(state: SportState, event: SportEvent): SportState = {
    val msg = s"unexpected event [$event] in state [$state]"
    val exception = new IllegalStateException(msg)
    log.warn(msg, exception)
    throw exception
  }
}
