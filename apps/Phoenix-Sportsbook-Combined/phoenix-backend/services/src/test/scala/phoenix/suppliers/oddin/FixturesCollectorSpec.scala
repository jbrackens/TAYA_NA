package phoenix.suppliers.oddin

import java.time.OffsetDateTime

import scala.concurrent.ExecutionContext
import scala.concurrent.Future
import scala.util.Try

import akka.actor.typed.scaladsl.TimerScheduler
import akka.actor.typed.scaladsl.adapter._
import akka.stream.scaladsl.Sink
import com.github.tomakehurst.wiremock.client.WireMock._
import org.scalamock.function.StubFunction2
import org.scalatest.wordspec.AnyWordSpecLike

import phoenix.core.Clock
import phoenix.core.domain.DataProvider
import phoenix.markets.MarketsBoundedContext
import phoenix.markets.MarketsBoundedContext.FixtureResult
import phoenix.markets.UpdateFixtureRequest
import phoenix.markets.fixtures.FixtureStatus
import phoenix.markets.sports.Competitor
import phoenix.markets.sports.FixtureLifecycleStatus
import phoenix.markets.sports.FixtureScore
import phoenix.markets.sports.SportEntity.CompetitorId
import phoenix.markets.sports.SportEntity.FixtureId
import phoenix.markets.sports.SportEntity.SportId
import phoenix.markets.sports.SportEntity.TournamentId
import phoenix.oddin.EndpointStub
import phoenix.oddin.OddinApiSpecSupport
import phoenix.oddin.domain.OddinRestApi
import phoenix.support._
import phoenix.time.FakeHardcodedClock

class FixturesCollectorSpec
    extends AnyWordSpecLike
    with ActorSystemIntegrationSpec
    with OddinApiSpecSupport
    with FutureSupport
    with HttpSpec {
  import FixturesCollectorSpec._

  implicit val classicAS = system.toClassic
  implicit val typedAS = system

  val fakeClock = new FakeHardcodedClock()

  def fakeFixturesCollector(c: OddinRestApi, mc: MarketsBoundedContext) =
    new FixturesCollector {
      override implicit val ec: ExecutionContext = scala.concurrent.ExecutionContext.Implicits.global
      override val client: OddinRestApi = c
      override val clock: Clock = fakeClock
      override val timers: TimerScheduler[CollectorBehaviors.CollectorMessage] =
        mock[TimerScheduler[CollectorBehaviors.CollectorMessage]]
      override val marketsContext: MarketsBoundedContext = mc
    }

  val dbFixtures = Seq(dbFixture.fixtureId)
  val fixtureResult =
    FixtureResult(
      SportId(DataProvider.Oddin, "not used"),
      TournamentId(DataProvider.Oddin, "not used"),
      FixtureId(DataProvider.Oddin, "not used"))

  "A Fixtures Collector" should {

    "Retrieve fixtures from DB and Oddin and enrich them" in {
      withOddinApi(
        requests = GetMatchSummaryRequests ++
          ListAllCurrentLiveSportEventsRequests ++
          ListAllSportEventsWithPreMatchOddsRequests,
        oddinConfig = specOddinConfig(httpBaseUrl)) { client =>
        // Given
        val marketsContext = stub[MarketsBoundedContext]
        val fixturesCollector = fakeFixturesCollector(client, marketsContext)

        // And
        val getFixtureIdFn: StubFunction2[Set[FixtureStatus], ExecutionContext, Future[Seq[FixtureId]]] =
          marketsContext.getFixtureIds(_: Set[FixtureStatus])(_: ExecutionContext)
        val createOrUpdateFn: StubFunction2[UpdateFixtureRequest, ExecutionContext, Future[FixtureResult]] =
          marketsContext.createOrUpdateFixture(_: UpdateFixtureRequest)(_: ExecutionContext)

        getFixtureIdFn.when(*, *).returns(Future.successful(dbFixtures))
        createOrUpdateFn.when(*, *).returns(Future.successful(fixtureResult))

        // When
        await(fixturesCollector.createSource().runWith(Sink.ignore))

        // Then
        getFixtureIdFn.verify(where { (s, _) => s == Set(FixtureStatus.InPlay) })
        createOrUpdateFn.verify(where((fixture, _) => assertExpectedFixtureRequest(fixture, dbFixture)))
        createOrUpdateFn.verify(where((fixture, _) => assertExpectedFixtureRequest(fixture, liveSportFixture)))
        createOrUpdateFn.verify(where((fixture, _) => assertExpectedFixtureRequest(fixture, preMatchFixture)))
      }
    }

  }

  def assertExpectedFixtureRequest(actual: UpdateFixtureRequest, expected: UpdateFixtureRequest): Boolean = {
    Try(java.util.UUID.fromString(actual.correlationId)).isSuccess &&
    actual.receivedAtUtc == fakeClock.currentOffsetDateTime() &&
    actual.sportId == expected.sportId &&
    actual.sportName == expected.sportName &&
    actual.sportAbbreviation == expected.sportAbbreviation &&
    actual.tournamentId == expected.tournamentId &&
    actual.tournamentName == expected.tournamentName &&
    actual.tournamentStartTime == expected.tournamentStartTime &&
    actual.fixtureId == expected.fixtureId &&
    actual.fixtureName == expected.fixtureName &&
    actual.startTime == expected.startTime &&
    actual.competitors == expected.competitors &&
    actual.currentScore == expected.currentScore &&
    actual.fixtureStatus == expected.fixtureStatus
  }

}

object FixturesCollectorSpec extends FileSupport {

  val SpecDataDir = "data/fixtures-collector-spec"

  val GetMatchSummaryRequests = Seq(
    EndpointStub(
      "/v1/sports/en/sport_events/od:match:1/summary",
      Seq(stringFromResource(SpecDataDir, fileName = "get-match-summary-response-1.xml")),
      exactly(1)),
    EndpointStub(
      "/v1/sports/en/sport_events/od:match:29424/summary",
      Seq(stringFromResource(SpecDataDir, fileName = "get-match-summary-response-29424.xml")),
      exactly(1)),
    EndpointStub(
      "/v1/sports/en/sport_events/od:match:28861/summary",
      Seq(stringFromResource(SpecDataDir, fileName = "get-match-summary-response-28861.xml")),
      exactly(1)))
  val ListAllCurrentLiveSportEventsRequests = Seq(
    EndpointStub(
      "/v1/sports/en/schedules/live/schedule",
      Seq(stringFromResource(SpecDataDir, fileName = "list-all-current-live-sport-events-response.xml")),
      exactly(1)))
  val ListAllSportEventsWithPreMatchOddsRequests = Seq(
    EndpointStub(
      "/v1/sports/en/schedules/pre/schedule?start=0&limit=1000",
      Seq(stringFromResource(SpecDataDir, fileName = "list-all-sport-events-with-pre-match-odds-response.xml")),
      exactly(1)),
    EndpointStub(
      "/v1/sports/en/schedules/pre/schedule?start=1&limit=1000",
      Seq("""<?xml version="1.0" encoding="UTF-8"?>
        |<schedule generated_at="2021-04-19T10:34:19"></schedule>""".stripMargin),
      exactly(1)))

  val dbFixture = UpdateFixtureRequest(
    "65d41967-aa1a-4dde-bea0-6d72b157c49d",
    OffsetDateTime.parse("2021-01-18T12:51:28Z"),
    SportId(DataProvider.Phoenix, "2"),
    "Dota 2",
    "Dota2",
    TournamentId(DataProvider.Oddin, "od:tournament:862"),
    "Asian DOTA2 Gold Occupation Competition S19",
    OffsetDateTime.parse("2020-10-28T23:00Z"),
    FixtureId(DataProvider.Oddin, "od:match:1"),
    "Team Aspirations vs Future.club",
    OffsetDateTime.parse("2020-11-09T09:50Z"),
    Set(
      Competitor(CompetitorId(DataProvider.Oddin, "od:competitor:699"), "Team Aspirations", "home"),
      Competitor(CompetitorId(DataProvider.Oddin, "od:competitor:704"), "Future.club", "away")),
    Some(FixtureScore(4, 5)),
    FixtureLifecycleStatus.PostGame)

  val liveSportFixture = UpdateFixtureRequest(
    "65d41967-aa1a-4dde-bea0-6d72b157c49d",
    OffsetDateTime.parse("2021-01-18T12:51:28Z"),
    SportId(DataProvider.Phoenix, "3"),
    "sportName29424",
    "abbr29424",
    TournamentId(DataProvider.Oddin, "od:tournament:29424"),
    "tournament29424",
    OffsetDateTime.parse("2020-10-15T23:00Z"),
    FixtureId(DataProvider.Oddin, "od:match:29424"),
    "SportEvent29424",
    OffsetDateTime.parse("2020-11-07T09:50Z"),
    Set(
      Competitor(CompetitorId(DataProvider.Oddin, "od:competitor:294241"), "competitor29424-c1", "home"),
      Competitor(CompetitorId(DataProvider.Oddin, "od:competitor:294242"), "competitor29424-c2", "away")),
    Some(FixtureScore(5, 6)),
    FixtureLifecycleStatus.PostGame)

  val preMatchFixture = UpdateFixtureRequest(
    "65d41967-aa1a-4dde-bea0-6d72b157c49d",
    OffsetDateTime.parse("2021-01-18T12:51:28Z"),
    SportId(DataProvider.Phoenix, "4"),
    "sportName28861",
    "abbr28861",
    TournamentId(DataProvider.Oddin, "od:tournament:28861"),
    "tournament28861",
    OffsetDateTime.parse("2020-10-29T23:00Z"),
    FixtureId(DataProvider.Oddin, "od:match:28861"),
    "SportEvent28861",
    OffsetDateTime.parse("2020-11-10T09:50Z"),
    Set(
      Competitor(CompetitorId(DataProvider.Oddin, "od:competitor:288611"), "competitor28861-c1", "home"),
      Competitor(CompetitorId(DataProvider.Oddin, "od:competitor:288612"), "competitor28861-c2", "away")),
    Some(FixtureScore(5, 6)),
    FixtureLifecycleStatus.InPlay)
}
