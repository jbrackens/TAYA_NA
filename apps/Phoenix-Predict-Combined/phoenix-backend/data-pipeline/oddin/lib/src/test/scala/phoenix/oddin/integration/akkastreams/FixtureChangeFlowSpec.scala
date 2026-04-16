package phoenix.oddin.integration.akkastreams
import akka.actor.testkit.typed.scaladsl.ScalaTestWithActorTestKit
import akka.actor.typed.scaladsl.adapter._
import akka.http.scaladsl.model.StatusCodes
import akka.stream.scaladsl.Source
import akka.stream.testkit.TestSubscriber.Probe
import akka.stream.testkit.scaladsl.TestSink
import org.scalatest.matchers.should.Matchers
import org.scalatest.wordspec.AnyWordSpecLike

import phoenix.core.ScalaObjectUtils._
import phoenix.core.TimeUtils._
import phoenix.dataapi.internal.oddin.Competitor
import phoenix.dataapi.internal.oddin.FixtureChangedEvent
import phoenix.dataapi.internal.oddin.MatchScore
import phoenix.oddin.domain.OddinSportEventId
import phoenix.oddin.domain.OddinStreamingApi.CorrelationId
import phoenix.oddin.domain.OddinStreamingApi.FixtureChangeFlow
import phoenix.oddin.domain.OddinStreamingApi.FixtureChangeMessage
import phoenix.oddin.domain.OddinStreamingApi.OddinMessage
import phoenix.oddin.domain.OddinStreamingApi.ReceivedAt
import phoenix.oddin.domain.fixtureChange.FixtureChange
import phoenix.oddin.infrastructure.OddinConfig
import phoenix.oddin.infrastructure.akkastreams.FixtureChangeFlow
import phoenix.oddin.infrastructure.xml.UnsafeOddinValueObjectExtensions.UnsafeSportEventIdOps
import phoenix.oddin.support.OddinRestApiSupport.createClient
import phoenix.oddin.support.OddinRestApiSupport.createFailingClient
import phoenix.oddin.support.TestResponse
import phoenix.support.ConstantUUIDGenerator
import phoenix.support.FileSupport
import phoenix.time.FakeHardcodedClock

class FixtureChangeFlowSpec extends ScalaTestWithActorTestKit with AnyWordSpecLike with Matchers with FileSupport {

  private val clock = new FakeHardcodedClock()
  private val apiConfig = OddinConfig.of(system).apiConfig

  private val correlationId = CorrelationId(ConstantUUIDGenerator.generate())
  private val receivedAt = ReceivedAt(clock.currentOffsetDateTime())
  private val parallelism = 1

  s"${FixtureChangeFlow.simpleObjectName}" should {

    s"emit a ${FixtureChangedEvent.simpleObjectName}" in {

      // given
      val oddinRestApi = createClient(
        apiConfig,
        TestResponse(
          s"/v1/sports/en/sport_events/od:match:19816/summary",
          fromFile(fileName = "get-match-summary-response.xml")))

      val fixtureChange = FixtureChange(OddinSportEventId.fromStringUnsafe("od:match:19816"))
      val input = OddinMessage(correlationId, receivedAt, payload = fixtureChange)
      val sink = createSink(input, FixtureChangeFlow(oddinRestApi, parallelism))

      // when
      val fixtureChangedEventReceived = sink.requestNext(expectationTimeout)

      fixtureChangedEventReceived shouldBe expectedFixtureChangedEvent
    }

    "drop messages when Oddin REST API fails" in {

      // given
      val oddinRestApi = createFailingClient(apiConfig, StatusCodes.BadRequest)
      val fixtureChange = FixtureChange(OddinSportEventId.fromStringUnsafe("od:match:19816"))
      val input = OddinMessage(correlationId, receivedAt, payload = fixtureChange)
      val sink = createSink(input, FixtureChangeFlow(oddinRestApi, parallelism))

      // then
      sink.expectSubscription()
      sink.expectNoMessage()
    }
  }

  private def createSink(
      input: FixtureChangeMessage,
      fixtureChangeFlow: FixtureChangeFlow): Probe[FixtureChangedEvent] =
    Source.single(input).via(fixtureChangeFlow).runWith(TestSink.probe[FixtureChangedEvent](system.toClassic))

  private def fromFile(fileName: String): String =
    stringFromResource(baseDir = "data/akkastreams/fixture-change-flow", fileName)

  private val expectedFixtureChangedEvent = FixtureChangedEvent(
    correlationId = correlationId.value.toString,
    receivedAtUtc = receivedAt.value.toEpochMilli,
    sportId = "od:sport:2",
    sportName = "Dota 2",
    sportAbbreviation = "Dota2",
    tournamentId = "od:tournament:862",
    tournamentName = "Asian DOTA2 Gold Occupation Competition S19",
    tournamentStartTimeUtc = "2020-10-28T23:00:00".toUtcOffsetDateTimeFromLocalDateTimeFormat.toInstant.toEpochMilli,
    fixtureId = "od:match:19816",
    fixtureName = "Team Aspirations vs Future.club",
    startTimeUtc = "2020-11-09T09:50:00Z".toUtcOffsetDateTime.toInstant.toEpochMilli,
    eventStatus = "CLOSED",
    competitors = Seq(
      Competitor("od:competitor:699", "Team Aspirations", "HOME"),
      Competitor("od:competitor:704", "Future.club", "AWAY")),
    currentScore = MatchScore(4, 5))
}
