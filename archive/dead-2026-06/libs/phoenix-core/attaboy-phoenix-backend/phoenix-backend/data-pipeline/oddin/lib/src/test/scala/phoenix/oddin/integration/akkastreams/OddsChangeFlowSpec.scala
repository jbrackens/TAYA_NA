package phoenix.oddin.integration.akkastreams
import akka.actor.testkit.typed.scaladsl.ScalaTestWithActorTestKit
import akka.actor.typed.scaladsl.adapter._
import akka.stream.scaladsl.Source
import akka.stream.testkit.TestSubscriber.Probe
import akka.stream.testkit.scaladsl.TestSink
import org.scalatest.matchers.should.Matchers
import org.scalatest.wordspec.AnyWordSpecLike

import phoenix.core.ScalaObjectUtils._
import phoenix.core.TimeUtils._
import phoenix.core.XmlUtils._
import phoenix.core.odds.Odds
import phoenix.dataapi.internal.phoenix.MarketChangedEvent
import phoenix.dataapi.internal.phoenix.SelectionOdds
import phoenix.oddin.domain.OddinStreamingApi.CorrelationId
import phoenix.oddin.domain.OddinStreamingApi.OddinMessage
import phoenix.oddin.domain.OddinStreamingApi.OddsChangeFlow
import phoenix.oddin.domain.OddinStreamingApi.OddsChangeMessage
import phoenix.oddin.domain.OddinStreamingApi.ReceivedAt
import phoenix.oddin.domain._
import phoenix.oddin.domain.marketChange._
import phoenix.oddin.domain.marketDescription.MarketDescription
import phoenix.oddin.domain.oddsChange.OddsChange
import phoenix.oddin.domain.sportEventStatusChange.SportEventStatusChange
import phoenix.oddin.infrastructure.akkastreams.OddsChangeFlow
import phoenix.oddin.infrastructure.xml.MarketDescriptionXmlReaders._
import phoenix.oddin.infrastructure.xml.UnsafeOddinValueObjectExtensions.UnsafeMarketSpecifiersOps
import phoenix.oddin.infrastructure.xml.UnsafeOddinValueObjectExtensions.UnsafeMarketStatusOps
import phoenix.oddin.infrastructure.xml.UnsafeOddinValueObjectExtensions.UnsafeOutcomeActiveOps
import phoenix.oddin.infrastructure.xml.UnsafeOddinValueObjectExtensions.UnsafeSportEventIdOps
import phoenix.oddin.support.MarketDescriptionsRepositoryMock
import phoenix.support.ConstantUUIDGenerator
import phoenix.support.FileSupport
import phoenix.time.FakeHardcodedClock

class OddsChangeFlowSpec extends ScalaTestWithActorTestKit with AnyWordSpecLike with Matchers with FileSupport {

  private implicit val typedSystem = system
  private implicit val ec = system.executionContext

  private val clock = new FakeHardcodedClock()

  private val correlationId = CorrelationId(ConstantUUIDGenerator.generate())
  private val receivedAt = ReceivedAt(clock.currentOffsetDateTime())
  private val parallelism = 1

  s"${OddsChangeFlow.simpleObjectName}" should {

    s"emit ${MarketChangedEvent.simpleObjectName}s" in {

      // Given
      val marketDescriptions = marketChangeFile("list-all-market-descriptions-response.xml").parseXml
        .convertTo[List[MarketDescription]]
        .getOrElse(throw new RuntimeException("Failed to read market descriptions from file"))
      val marketDescriptionsRepository = MarketDescriptionsRepositoryMock.withDescriptions(marketDescriptions)

      val input = OddinMessage(correlationId, receivedAt, payload = oddsChangeInput)
      val sink = createSink(input, OddsChangeFlow(marketDescriptionsRepository, parallelism))

      // When
      sink.request(3)

      // Then
      sink.expectNext(expectationTimeout) shouldBe firstExpectedMarketChangedEvent
      sink.expectNext(expectationTimeout) shouldBe secondExpectedMarketChangedEvent
      sink.expectNext(expectationTimeout) shouldBe thirdExpectedMarketChangedEvent
    }

    "fail when the description is not expected" in {
      // Given
      val marketDescriptions = marketChangeFile("list-all-market-unexpected-description-response.xml").parseXml
        .convertTo[List[MarketDescription]]
        .getOrElse(throw new RuntimeException("Failed to read market descriptions from file"))
      val marketDescriptionsRepository = MarketDescriptionsRepositoryMock.withDescriptions(marketDescriptions)

      // When
      val input = OddinMessage(correlationId, receivedAt, payload = oddsChangeBrokenDescription)
      val sink = createSink(input, OddsChangeFlow(marketDescriptionsRepository, parallelism))

      // Then
      sink.expectSubscription()
      sink.expectNoMessage(expectationTimeout)
    }
  }

  private def createSink(input: OddsChangeMessage, marketChangeFlow: OddsChangeFlow): Probe[MarketChangedEvent] =
    Source.single(input).via(marketChangeFlow).runWith(TestSink.probe[MarketChangedEvent](system.toClassic))

  private def marketChangeFile(fileName: String): String =
    stringFromResource(baseDir = "data/akkastreams/market-change-flow", fileName)

  private val oddsChangeInput = OddsChange(
    Some(
      SportEventStatusChange(
        OddinSportEventId.fromStringUnsafe("od:match:19816"),
        HomeScore(4),
        AwayScore(5),
        FixtureStatus.NOT_STARTED)),
    MarketChange(
      OddinSportEventId.fromStringUnsafe("od:match:19816"),
      List(
        Market(
          MarketDescriptionId(27),
          MarketSpecifiers.fromStringUnsafe("threshold=36|map=3"),
          MarketStatus.fromIntUnsafe(-1),
          List(
            Outcome(OutcomeId(5), None, OutcomeActive.fromIntUnsafe(0)),
            Outcome(OutcomeId(4), None, OutcomeActive.fromIntUnsafe(0)))),
        Market(
          MarketDescriptionId(2),
          MarketSpecifiers.fromStringUnsafe("handicap=1.5"),
          MarketStatus.fromIntUnsafe(1),
          List(
            Outcome(OutcomeId(2), Some(OutcomeOdds(Odds(1.3))), OutcomeActive.fromIntUnsafe(1)),
            Outcome(OutcomeId(1), Some(OutcomeOdds(Odds(3.24))), OutcomeActive.fromIntUnsafe(1)))),
        Market(
          MarketDescriptionId(6),
          MarketSpecifiers.fromStringUnsafe("variant=way:two|map=2|way=two"),
          MarketStatus.fromIntUnsafe(1),
          List(
            Outcome(OutcomeId(2), Some(OutcomeOdds(Odds(1.94))), OutcomeActive.fromIntUnsafe(1)),
            Outcome(OutcomeId(1), Some(OutcomeOdds(Odds(1.79))), OutcomeActive.fromIntUnsafe(1)))))))

  private val oddsChangeBrokenDescription = OddsChange(
    Some(
      SportEventStatusChange(
        OddinSportEventId.fromStringUnsafe("od:match:19816"),
        HomeScore(4),
        AwayScore(5),
        FixtureStatus.NOT_STARTED)),
    MarketChange(
      OddinSportEventId.fromStringUnsafe("od:match:19816"),
      List(
        Market(
          MarketDescriptionId(1),
          MarketSpecifiers.fromStringUnsafe("variant=way:two|way=two"),
          MarketStatus.fromIntUnsafe(-1),
          List()))))

  private val firstExpectedMarketChangedEvent = MarketChangedEvent(
    correlationId = correlationId.value.toString,
    receivedAtUtc = receivedAt.value.toEpochMilli,
    fixtureId = "od:match:19816",
    marketId = "od:match:19816:27:map=3|threshold=36",
    marketName = "Map duration 36 - map 3",
    marketStatus = "SUSPENDED",
    marketType = "MAP_DURATION",
    marketCategory = Some("Map duration X"),
    marketPriority = 27,
    marketSpecifiers = Map("threshold" -> "36", "map" -> "3"),
    selectionOdds = Seq(
      SelectionOdds(
        correlationId.value.toString,
        marketId = "od:match:19816:27:map=3|threshold=36",
        selectionId = 5,
        selectionName = "over",
        odds = None,
        active = false),
      SelectionOdds(
        correlationId.value.toString,
        marketId = "od:match:19816:27:map=3|threshold=36",
        selectionId = 4,
        selectionName = "under",
        odds = None,
        active = false)))

  private val secondExpectedMarketChangedEvent: MarketChangedEvent =
    MarketChangedEvent(
      correlationId = correlationId.value.toString,
      receivedAtUtc = receivedAt.value.toEpochMilli,
      fixtureId = "od:match:19816",
      marketId = "od:match:19816:2:handicap=1.5",
      marketName = "Match handicap 1.5",
      marketStatus = "ACTIVE",
      marketType = "MATCH_HANDICAP",
      marketCategory = Some("Match handicap"),
      marketPriority = 2,
      marketSpecifiers = Map("handicap" -> "1.5"),
      selectionOdds = Seq(
        SelectionOdds(
          correlationId = correlationId.value.toString,
          marketId = "od:match:19816:2:handicap=1.5",
          selectionId = 2,
          selectionName = "away",
          odds = Some("1.3000"),
          active = true),
        SelectionOdds(
          correlationId = correlationId.value.toString,
          marketId = "od:match:19816:2:handicap=1.5",
          selectionId = 1,
          selectionName = "home",
          odds = Some("3.2400"),
          active = true)))

  private val thirdExpectedMarketChangedEvent: MarketChangedEvent =
    MarketChangedEvent(
      correlationId = correlationId.value.toString,
      receivedAtUtc = receivedAt.value.toEpochMilli,
      fixtureId = "od:match:19816",
      marketId = "od:match:19816:6:map=2|variant=way:two|way=two",
      marketName = "Map 2 winner - twoway",
      marketStatus = "ACTIVE",
      marketType = "MAP_WINNER",
      marketCategory = Some("Map X winner - twoway"),
      marketPriority = 6,
      marketSpecifiers = Map("variant" -> "way:two", "map" -> "2", "way" -> "two"),
      selectionOdds = Seq(
        SelectionOdds(
          correlationId = correlationId.value.toString,
          marketId = "od:match:19816:6:map=2|variant=way:two|way=two",
          selectionId = 2,
          selectionName = "away",
          odds = Some("1.9400"),
          active = true),
        SelectionOdds(
          correlationId = correlationId.value.toString,
          marketId = "od:match:19816:6:map=2|variant=way:two|way=two",
          selectionId = 1,
          selectionName = "home",
          odds = Some("1.7900"),
          active = true)))
}
