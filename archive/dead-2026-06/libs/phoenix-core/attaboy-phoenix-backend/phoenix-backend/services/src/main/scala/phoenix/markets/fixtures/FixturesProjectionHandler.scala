package phoenix.markets.fixtures

import java.time.OffsetDateTime

import scala.concurrent.Future

import akka.Done
import akka.actor.typed.ActorSystem
import akka.projection.eventsourced.EventEnvelope
import org.slf4j.LoggerFactory

import phoenix.markets.MarketsBoundedContext
import phoenix.markets.MarketsBoundedContext.FixtureScoreChange
import phoenix.markets.MarketsRepository
import phoenix.markets.sports
import phoenix.markets.sports.Competitor
import phoenix.markets.sports.Fixture
import phoenix.markets.sports.FixtureLifecycleStatus
import phoenix.markets.sports.FixtureScore
import phoenix.markets.sports.SportEntity.FixtureId
import phoenix.markets.sports.SportProtocol.Events._
import phoenix.projections.ProjectionEventHandler

final class FixturesProjectionHandler(system: ActorSystem[_], repository: MarketsRepository)
    extends ProjectionEventHandler[SportEvent] {
  private val log = LoggerFactory.getLogger(getClass)

  implicit val ec = system.executionContext

  override def process(envelope: EventEnvelope[SportEvent]): Future[Done] = {
    log.info("handling SportEvent (fixture) - {}", envelope.event)

    envelope.event match {
      case FixtureCreated(_, fixture, createdAt) =>
        handleFixtureCreated(fixture, createdAt)

      case FixtureInfoChanged(_, fixtureId, fixtureName, startTime, competitors, _) =>
        handleFixtureInfoChanged(fixtureId, fixtureName, startTime, competitors)

      case FixtureScoreChanged(_, fixtureId, currentScore, updatedAt) =>
        handleFixtureScoreChanged(fixtureId, currentScore, updatedAt)

      case FixtureStatusChanged(_, fixtureId, lifecycleStatus, updatedAt) =>
        handleFixtureStatusChanged(fixtureId, lifecycleStatus, updatedAt)

      case otherEvent =>
        log.info("Received {}", otherEvent)
        Future.successful(Done)
    }
  }

  private[this] def handleFixtureCreated(fixture: Fixture, createdAt: OffsetDateTime): Future[Done] = {
    val f = MarketsBoundedContext.Fixture(
      fixtureId = fixture.fixtureId,
      name = fixture.name,
      tournamentId = fixture.tournamentId,
      startTime = fixture.startTime,
      competitors = convertCompetitors(fixture.competitors),
      scoreHistory =
        Seq(MarketsBoundedContext.FixtureScoreChange(convertFixtureScore(fixture.currentScore), createdAt)),
      lifecycleStatus = fixture.fixtureLifecycleStatus,
      statusHistory =
        Seq(MarketsBoundedContext.FixtureLifecycleStatusChange(fixture.fixtureLifecycleStatus, createdAt)),
      finishTime = None,
      createdAt = createdAt)

    repository.saveFixture(f)
  }

  private[this] def handleFixtureInfoChanged(
      fixtureId: FixtureId,
      fixtureName: String,
      startTime: OffsetDateTime,
      competitors: Set[Competitor]): Future[Done] = {
    val publicCompetitors = convertCompetitors(competitors)
    repository.updateFixtureInfo(fixtureId, fixtureName, startTime, publicCompetitors)
  }

  private[this] def handleFixtureScoreChanged(
      fixtureId: FixtureId,
      currentScore: FixtureScore,
      updatedAt: OffsetDateTime): Future[Done] = {
    val fixtureScoreChange = FixtureScoreChange(currentScore, updatedAt)
    repository.addFixtureScoreChange(fixtureId, fixtureScoreChange)
  }

  private[this] def handleFixtureStatusChanged(
      fixtureId: FixtureId,
      lifecycleStatus: FixtureLifecycleStatus,
      updatedAt: OffsetDateTime): Future[Done] = {
    val updates = Seq(
        repository.addFixtureLifecycleStatusChange(
          fixtureId,
          MarketsBoundedContext.FixtureLifecycleStatusChange(lifecycleStatus, updatedAt))) ++
      Option.when(FixtureStatus.Finished.fixtureLifecycleStatusMappings.contains(lifecycleStatus)) {
        repository.markFixtureFinished(fixtureId, updatedAt)
      }
    Future.sequence(updates).map(_ => Done)
  }

  private[this] def convertFixtureScore(fixtureScore: FixtureScore): sports.FixtureScore = {
    val home = fixtureScore.home
    val away = fixtureScore.away

    sports.FixtureScore(home, away)
  }

  private[this] def convertCompetitors(competitors: Set[Competitor]): Seq[MarketsBoundedContext.Competitor] =
    competitors.map(convertCompetitor).toSeq

  private[this] def convertCompetitor(competitor: Competitor): MarketsBoundedContext.Competitor = {
    val id = competitor.id
    val name = competitor.name
    val qualifier = competitor.qualifier

    MarketsBoundedContext.Competitor(id, name, qualifier)
  }
}
