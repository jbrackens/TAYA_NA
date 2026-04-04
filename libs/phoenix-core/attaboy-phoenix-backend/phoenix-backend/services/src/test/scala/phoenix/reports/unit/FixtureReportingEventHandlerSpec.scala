package phoenix.reports.unit

import java.util.concurrent.Executors

import scala.concurrent.ExecutionContext
import scala.concurrent.Future

import org.scalamock.scalatest.MockFactory
import org.scalatest.matchers.should.Matchers
import org.scalatest.wordspec.AnyWordSpec

import phoenix.core.Clock
import phoenix.markets.sports.SportProtocol.Events.FixtureCreated
import phoenix.markets.sports.SportProtocol.Events.FixtureInfoChanged
import phoenix.reports.application.es.FixtureReportingEventHandler
import phoenix.reports.domain.FixtureMarketRepository
import phoenix.reports.domain.model.markets.Fixture
import phoenix.support.DataGenerator.generateFixtureId
import phoenix.support.DataGenerator.generateFixtureName
import phoenix.support.DataGenerator.generateSportFixture
import phoenix.support.DataGenerator.generateSportId
import phoenix.support.FutureSupport

final class FixtureReportingEventHandlerSpec extends AnyWordSpec with Matchers with FutureSupport with MockFactory {
  implicit val ec: ExecutionContext = ExecutionContext.fromExecutor(Executors.newSingleThreadExecutor())
  val clock: Clock = Clock.utcClock

  "A FixtureReportingEventHandler" should {
    "handle FixtureCreated event" in {
      val sportFixture = generateSportFixture()
      val event =
        FixtureCreated(sportId = generateSportId(), fixture = sportFixture, createdAt = clock.currentOffsetDateTime())

      val expectedFixture = Fixture(sportFixture.fixtureId, sportFixture.name, sportFixture.startTime)
      val fixtureMarkets = mock[FixtureMarketRepository]
      (fixtureMarkets.upsert(_: Fixture)).expects(expectedFixture).returns(Future.unit).once()

      await(FixtureReportingEventHandler.handle(fixtureMarkets)(event))
    }

    "handle FixtureInfoChanged event" in {
      val event =
        FixtureInfoChanged(
          sportId = generateSportId(),
          fixtureId = generateFixtureId(),
          name = generateFixtureName(),
          startTime = clock.currentOffsetDateTime(),
          competitors = Set.empty,
          updatedAt = clock.currentOffsetDateTime())

      val expectedFixture = Fixture(event.fixtureId, event.name, event.startTime)
      val fixtureMarkets = mock[FixtureMarketRepository]
      (fixtureMarkets.upsert(_: Fixture)).expects(expectedFixture).returns(Future.unit).once()

      await(FixtureReportingEventHandler.handle(fixtureMarkets)(event))
    }
  }
}
