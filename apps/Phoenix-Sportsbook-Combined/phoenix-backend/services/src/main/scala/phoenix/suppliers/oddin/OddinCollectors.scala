package phoenix.suppliers.oddin

import java.util.UUID

import scala.concurrent.ExecutionContext
import scala.concurrent.Future
import scala.concurrent.duration._
import scala.util.Failure
import scala.util.Success

import akka.Done
import akka.NotUsed
import akka.actor.typed.ActorSystem
import akka.actor.typed.scaladsl.TimerScheduler
import akka.stream.Materializer
import akka.stream.ThrottleMode
import akka.stream.scaladsl.Merge
import akka.stream.scaladsl.Sink
import akka.stream.scaladsl.Source
import cats.syntax.option._
import org.slf4j.Logger
import org.slf4j.LoggerFactory

import phoenix.core.Clock
import phoenix.core.domain.DataProvider
import phoenix.markets.MarketsBoundedContext
import phoenix.markets.UpdateFixtureRequest
import phoenix.markets.UpdateSportRequest
import phoenix.markets.fixtures
import phoenix.markets.sports
import phoenix.markets.sports.Competitor
import phoenix.markets.sports.FixtureLifecycleStatus
import phoenix.markets.sports.FixtureScore
import phoenix.markets.sports.SportEntity.CompetitorId
import phoenix.markets.sports.SportEntity.FixtureId
import phoenix.markets.sports.SportEntity.SportId
import phoenix.markets.sports.SportEntity.TournamentId
import phoenix.oddin.domain
import phoenix.oddin.domain.OddinRestApi
import phoenix.oddin.domain.OddinSportEventId
import phoenix.suppliers.common.SportMapper
import phoenix.suppliers.oddin.CollectorBehaviors.CollectorMessage
import phoenix.suppliers.oddin.CollectorBehaviors.Next

trait Collector {
  def createSource(): Source[Done, NotUsed]
  def scheduleNext(): Unit

  def collect()(implicit ec: ExecutionContext, mat: Materializer): Unit = {
    createSource().runWith(Sink.ignore).onComplete {
      case Success(_)         => scheduleNext()
      case Failure(exception) => throw new RuntimeException(s"collection stream failed $exception")
    }
  }
}

trait FlowConverters {
  val log: Logger
  implicit val ec: ExecutionContext

  val client: OddinRestApi
  val clock: Clock
  val timers: TimerScheduler[CollectorMessage]
  val marketsContext: MarketsBoundedContext

  def flatMapSportEventIds(source: Source[Seq[OddinSportEventId], NotUsed]): Source[OddinSportEventId, NotUsed] =
    source.flatMapConcat(ids => Source(ids))

  def typedMatchSummaryToFixtureRequest(matchSummary: domain.MatchSummary, sportId: SportId): UpdateFixtureRequest = {

    val sportEvent = matchSummary.sportEvent
    val sportEventStatus = matchSummary.status

    val correlationId = UUID.randomUUID().toString
    val receivedAtUtc = clock.currentOffsetDateTime()
    val sportName = sportEvent.sport.name.value
    val sportAbbreviation = sportEvent.sport.abbreviation.value
    val tournamentId = TournamentId(DataProvider.Oddin, sportEvent.tournament.id.value)
    val tournamentName = sportEvent.tournament.name.value
    val tournamentStartTime = sportEvent.tournament.startTime.value
    val fixtureId = FixtureId(DataProvider.Oddin, sportEvent.id.value)
    val fixtureName = sportEvent.name.value
    val startTime = sportEvent.startTime.value
    val competitors = sportEvent.competitors.map(convertTypedCompetitor).toSet
    val currentScore = FixtureScore(sportEventStatus.homeScore.value, sportEventStatus.awayScore.value).some

    val fixtureStatus: FixtureLifecycleStatus = sportEventStatus.state match {
      case domain.SportEventState.NotStarted  => FixtureLifecycleStatus.PreGame
      case domain.SportEventState.Started     => FixtureLifecycleStatus.InPlay
      case domain.SportEventState.Live        => FixtureLifecycleStatus.InPlay
      case domain.SportEventState.Suspended   => FixtureLifecycleStatus.BreakInPlay
      case domain.SportEventState.Ended       => FixtureLifecycleStatus.PostGame
      case domain.SportEventState.Finalized   => FixtureLifecycleStatus.PostGame
      case domain.SportEventState.Cancelled   => FixtureLifecycleStatus.GameAbandoned
      case domain.SportEventState.Abandoned   => FixtureLifecycleStatus.GameAbandoned
      case domain.SportEventState.Delayed     => FixtureLifecycleStatus.PreGame
      case domain.SportEventState.Postponed   => FixtureLifecycleStatus.Postponed
      case domain.SportEventState.Interrupted => FixtureLifecycleStatus.BreakInPlay
      case domain.SportEventState.Closed      => FixtureLifecycleStatus.PostGame
    }

    val fixtureRequest = UpdateFixtureRequest(
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
      currentScore,
      fixtureStatus)
    log.info(s"matchSummaryToFixtureRequest: UpdateFixtureRequest: $fixtureRequest")

    fixtureRequest
  }

  private def convertTypedCompetitor(competitor: domain.Competitor): sports.Competitor = {
    val id = CompetitorId(DataProvider.Oddin, competitor.id.value)
    val name = competitor.name.value
    val qualifier = competitor.side.entryName.toLowerCase

    Competitor(id, name, qualifier)
  }
}

trait SportsCollector extends Collector {
  implicit val ec: ExecutionContext

  val client: OddinRestApi
  val clock: Clock
  val timers: TimerScheduler[CollectorMessage]
  val marketsContext: MarketsBoundedContext
  val log = LoggerFactory.getLogger(getClass)

  override def createSource(): Source[Done, NotUsed] =
    Source
      .future(
        client
          .listAllSports()
          .foldF(error => Future.failed(new Exception(s"Error getting sports from oddin: $error")), Future.successful))
      .flatMapConcat(sports => Source(sports.toList))
      .map { sport =>
        val maybeSportId = SportMapper.fromExternalSportId(SportId(DataProvider.Oddin, sport.id.value))
        if (maybeSportId.isEmpty) {
          log.info(s"Ignoring unknown sport in Oddin SportCollector: ${sport.id.value}.")
        }
        (sport, maybeSportId)
      }
      .collect { case (sport, Some(sportId)) => (sport, sportId) }
      .mapAsync(10) {
        case (sport, sportId) =>
          val correlationId = UUID.randomUUID().toString
          val receivedAtUtc = clock.currentOffsetDateTime()
          val sportName = sport.name.value
          val sportAbbreviation = sport.abbreviation.value

          // Setting `displayToPunters` to None,
          // since we don't want to automatically change visibility status in either way.
          val request =
            UpdateSportRequest(
              correlationId,
              receivedAtUtc,
              sportId,
              sportName,
              sportAbbreviation,
              displayToPunters = None)

          marketsContext.createOrUpdateSport(request)
      }
      .map { _ => Done }

  override def scheduleNext(): Unit = timers.startSingleTimer(Next, 1.day)
}

class SportsCollectorImpl(
    val system: ActorSystem[_],
    val timers: TimerScheduler[CollectorMessage],
    val client: OddinRestApi,
    val clock: Clock,
    val marketsContext: MarketsBoundedContext)(implicit val ec: ExecutionContext)
    extends SportsCollector

object SportsCollector {

  def apply(
      system: ActorSystem[_],
      timers: TimerScheduler[CollectorMessage],
      client: OddinRestApi,
      clock: Clock,
      marketsContext: MarketsBoundedContext)(implicit ec: ExecutionContext): SportsCollector =
    new SportsCollectorImpl(system, timers, client, clock, marketsContext)
}

trait FixturesCollector extends Collector with FlowConverters {
  implicit val ec: ExecutionContext

  val client: OddinRestApi
  val clock: Clock
  val timers: TimerScheduler[CollectorMessage]
  val marketsContext: MarketsBoundedContext
  override val log = LoggerFactory.getLogger(getClass)

  override def createSource(): Source[Done, NotUsed] = {
    val startingAtPage = 0
    val pageSize = 1000
    val fixturesWeThinkAreCurrentlyInPlay = Source
      .future(marketsContext.getFixtureIds(Set(fixtures.FixtureStatus.InPlay)))
      .flatMapConcat(fixtures => Source(fixtures.toList))
      .map(fixtureId => OddinSportEventId(fixtureId.id))
    val oddinInPlayFixturesSource = flatMapSportEventIds(
      Source.future(
        client
          .listAllCurrentLiveSportEvents()
          .foldF(
            error => Future.failed(new Exception(s"Error getting live sport events from oddin: $error")),
            Future.successful)
          .map(_.map(_.id))))
    val preMatchFixturesSource = flatMapSportEventIds(Source.unfoldAsync(startingAtPage) { currentPage =>
      client
        .listAllSportEventsWithPreMatchOdds(currentPage, pageSize)
        .foldF(
          error => Future.failed(new Exception(s"Error getting sport events with prematch odds from oddin: $error")),
          Future.successful)
        .map { result =>
          if (result.isEmpty) None
          else Some((currentPage + 1, result.map(_.id)))
        }
    })
    Source
      .combine(fixturesWeThinkAreCurrentlyInPlay, oddinInPlayFixturesSource, preMatchFixturesSource)(Merge(_))
      // -- Oddin REST API request Limits -- //
      .throttle(elements = 100, 10.minutes, maximumBurst = 100, ThrottleMode.Shaping)
      .throttle(elements = 300, 1.hour, maximumBurst = 300, ThrottleMode.Shaping)
      // ODDIN SportEvent does not contain current fixture status or scores
      // We must make an explicit call for each fixture to get that information.
      .mapAsync(10)(
        client
          .getMatchSummary(_)
          .foldF(
            error => Future.failed(new Exception(s"Error getting a match summary from oddin: $error")),
            Future.successful))
      .map { matchSummary =>
        val maybeSportId =
          SportMapper.fromExternalSportId(SportId(DataProvider.Oddin, matchSummary.sportEvent.sport.id.value))
        if (maybeSportId.isEmpty) {
          log.info(s"Ignoring unknown sport in Oddin FixtureCollector: ${matchSummary.sportEvent.sport.id.value}.")
        }
        (matchSummary, maybeSportId)
      }
      .collect { case (matchSummary, Some(sportId)) => (matchSummary, sportId) }
      .map((typedMatchSummaryToFixtureRequest _).tupled)
      .mapAsync(10)(marketsContext.createOrUpdateFixture)
      .map(_ => Done)
  }

  override def scheduleNext(): Unit = timers.startSingleTimer(Next, 1.day)
}

class FixturesCollectorImpl(
    val system: ActorSystem[_],
    val timers: TimerScheduler[CollectorMessage],
    val client: OddinRestApi,
    val clock: Clock,
    val marketsContext: MarketsBoundedContext)(implicit val ec: ExecutionContext)
    extends FixturesCollector

object FixturesCollector {

  def apply(
      system: ActorSystem[_],
      timers: TimerScheduler[CollectorMessage],
      client: OddinRestApi,
      clock: Clock,
      marketsContext: MarketsBoundedContext)(implicit ec: ExecutionContext): FixturesCollector =
    new FixturesCollectorImpl(system, timers, client, clock, marketsContext)
}

trait RecoveryCollector extends Collector with FlowConverters {
  implicit val ec: ExecutionContext

  val client: OddinRestApi
  val clock: Clock
  val timers: TimerScheduler[CollectorMessage]
  val marketsContext: MarketsBoundedContext
  override val log = LoggerFactory.getLogger(getClass)

  override def createSource(): Source[Done, NotUsed] = {
    val startingAtPage = 0
    val pageSize = 1000
    val fixturesWeThinkAreCurrentlyInPlay = Source
      .future(marketsContext.getFixtureIds(Set(fixtures.FixtureStatus.InPlay)))
      .flatMapConcat(fixtures => Source(fixtures.toList))
      .map(fixtureId => OddinSportEventId(fixtureId.id))

    val recoveryFixtureSource = for {
      lastUpdateTimestamp <- marketsContext.lastUpdateTimestamp()
      source <-
        client
          .recovery(after = lastUpdateTimestamp.toEpochSecond())
          .foldF(
            error => Future.failed(new Exception(s"Error getting recovery sport events from oddin: $error")),
            Future.successful)
          .map(_.map(_.id))
    } yield source

    val oddinInPlayFixturesSource = flatMapSportEventIds(Source.future(recoveryFixtureSource))
    val preMatchFixturesSource = flatMapSportEventIds(Source.unfoldAsync(startingAtPage) { currentPage =>
      client
        .listAllSportEventsWithPreMatchOdds(currentPage, pageSize)
        .foldF(
          error =>
            Future.failed(new Exception(s"Error getting recovery sport events with prematch odds from oddin: $error")),
          Future.successful)
        .map { result =>
          if (result.isEmpty) None
          else Some((currentPage + 1, result.map(_.id)))
        }
    })
    Source
      .combine(fixturesWeThinkAreCurrentlyInPlay, oddinInPlayFixturesSource, preMatchFixturesSource)(Merge(_))
      // -- Oddin REST API request Limits -- //
      .throttle(elements = 25, 20.minutes, maximumBurst = 25, ThrottleMode.Shaping)
      .throttle(elements = 100, 2.hour, maximumBurst = 100, ThrottleMode.Shaping)
      // ODDIN SportEvent does not contain current fixture status or scores
      // We must make an explicit call for each fixture to get that information.
      .mapAsync(10)(
        client
          .getMatchSummary(_)
          .foldF(
            error => Future.failed(new Exception(s"Error getting a match summary from oddin: $error")),
            Future.successful))
      .map { matchSummary =>
        val maybeSportId =
          SportMapper.fromExternalSportId(SportId(DataProvider.Oddin, matchSummary.sportEvent.sport.id.value))
        if (maybeSportId.isEmpty) {
          log.info(s"Ignoring unknown sport in Oddin RecoveryCollector: ${matchSummary.sportEvent.sport.id.value}.")
        }
        (matchSummary, maybeSportId)
      }
      .collect { case (matchSummary, Some(sportId)) => (matchSummary, sportId) }
      .map((typedMatchSummaryToFixtureRequest _).tupled)
      .mapAsync(10)(marketsContext.createOrUpdateFixture)
      .map(_ => Done)
  }

  override def scheduleNext(): Unit = ()
}

class RecoveryCollectorImpl(
    val system: ActorSystem[_],
    val timers: TimerScheduler[CollectorMessage],
    val client: OddinRestApi,
    val clock: Clock,
    val marketsContext: MarketsBoundedContext)(implicit val ec: ExecutionContext)
    extends RecoveryCollector

object RecoveryCollector {

  def apply(
      system: ActorSystem[_],
      timers: TimerScheduler[CollectorMessage],
      client: OddinRestApi,
      clock: Clock,
      marketsContext: MarketsBoundedContext)(implicit ec: ExecutionContext): RecoveryCollector =
    new RecoveryCollectorImpl(system, timers, client, clock, marketsContext)
}
