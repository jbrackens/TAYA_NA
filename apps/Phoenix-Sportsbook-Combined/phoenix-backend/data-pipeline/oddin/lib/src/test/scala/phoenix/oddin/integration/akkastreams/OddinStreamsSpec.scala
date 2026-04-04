package phoenix.oddin.integration.akkastreams
import akka.actor.testkit.typed.scaladsl.ScalaTestWithActorTestKit
import akka.actor.typed.scaladsl.adapter._
import akka.http.scaladsl.model.StatusCodes
import akka.stream.scaladsl.Sink
import akka.stream.testkit.scaladsl.TestSink
import org.scalatest.matchers.should.Matchers
import org.scalatest.wordspec.AnyWordSpecLike

import phoenix.core.ScalaObjectUtils._
import phoenix.core.TimeUtils._
import phoenix.core.XmlUtils._
import phoenix.dataapi.internal.oddin.Competitor
import phoenix.dataapi.internal.oddin.FixtureChangedEvent
import phoenix.dataapi.internal.oddin.MarketCancelEvent
import phoenix.dataapi.internal.oddin.MatchScore
import phoenix.dataapi.internal.phoenix.MarketChangedEvent
import phoenix.dataapi.internal.phoenix.MarketSettlementEvent
import phoenix.dataapi.internal.phoenix.SelectionOdds
import phoenix.dataapi.internal.phoenix.SelectionResult
import phoenix.oddin.domain.OddinMessageHandler.BetCancel
import phoenix.oddin.domain.OddinMessageHandler.BetSettlement
import phoenix.oddin.domain.OddinMessageHandler.FixtureChange
import phoenix.oddin.domain.OddinMessageHandler.OddsChange
import phoenix.oddin.domain.OddinStreamingApi.CorrelationId
import phoenix.oddin.domain.OddinStreamingApi.ReceivedAt
import phoenix.oddin.domain.marketDescription.MarketDescription
import phoenix.oddin.infrastructure.OddinConfig
import phoenix.oddin.infrastructure.OddinMessageAdapter
import phoenix.oddin.infrastructure.OddinStreams
import phoenix.oddin.infrastructure.xml.MarketDescriptionXmlReaders._
import phoenix.oddin.support.MarketDescriptionsRepositoryMock
import phoenix.oddin.support.OddinRestApiSupport.createClient
import phoenix.oddin.support.OddinRestApiSupport.createFailingClient
import phoenix.oddin.support.TestResponse
import phoenix.support.ConstantUUIDGenerator
import phoenix.support.FileSupport
import phoenix.time.FakeHardcodedClock

class OddinStreamsSpec extends ScalaTestWithActorTestKit with AnyWordSpecLike with Matchers with FileSupport {

  implicit private val classicSystem = testKit.system.toClassic
  implicit private val ec = system.executionContext

  private val oddinConfig = OddinConfig.of(system)
  private val clock = new FakeHardcodedClock()
  private val parallelism = 1

  private val marketDescriptionsRepository = {
    val marketDescriptions =
      stringFromResource(fileName = "list-all-market-descriptions-response.xml").parseXml
        .convertTo[List[MarketDescription]]
        .getOrElse(throw new RuntimeException("Failed to read market descriptions from file"))
    MarketDescriptionsRepositoryMock.withDescriptions(marketDescriptions)
  }

  private val correlationId = CorrelationId(ConstantUUIDGenerator.generate())
  private val receivedAt = ReceivedAt(clock.currentOffsetDateTime())

  "OddinStreams" should {

    s"produce ${FixtureChangedEvent.simpleObjectName}s" in {

      // Given
      val oddinRestApi = createClient(
        oddinConfig.apiConfig,
        TestResponse(
          s"/v1/sports/en/sport_events/od:match:19816/summary",
          stringFromResource(baseDir = "data/http", fileName = "get-match-summary-response.xml")))

      val adapter = new OddinMessageAdapter(ConstantUUIDGenerator, clock)
      val oddinStreams =
        new OddinStreams(adapter, oddinRestApi, marketDescriptionsRepository)

      // And
      val input = FixtureChange(
        stringFromResource(baseDir = "data/akkastreams/fixture-change-flow", fileName = "fixture-change.xml"))

      // And
      val graph =
        oddinStreams.buildRunnableGraph(
          parallelism,
          parallelism,
          Sink.ignore,
          TestSink.probe[FixtureChangedEvent],
          Sink.ignore,
          Sink.ignore)

      val (_, fixtureProbe, _, _) = graph.run()

      // When
      adapter.onFixtureChange(input)

      // Then
      fixtureProbe.requestNext(expectationTimeout) shouldBe expectedFixtureChangedEvent
      fixtureProbe.expectNoMessage(expectationTimeout)
    }

    s"produce ${MarketChangedEvent.simpleObjectName}s" in {
      // Given
      val oddinRestApi = createClient(
        oddinConfig.apiConfig,
        TestResponse(
          s"/v1/sports/en/sport_events/od:match:19816/summary",
          stringFromResource(baseDir = "data/http", fileName = "get-match-summary-response.xml")))

      val adapter = new OddinMessageAdapter(ConstantUUIDGenerator, clock)
      val oddinStreams =
        new OddinStreams(adapter, oddinRestApi, marketDescriptionsRepository)

      // And
      val input =
        OddsChange(stringFromResource(baseDir = "data/akkastreams/market-change-flow", fileName = "odds-change.xml"))

      // And
      val graph = oddinStreams.buildRunnableGraph(
        parallelism,
        parallelism,
        TestSink.probe[MarketChangedEvent],
        TestSink.probe[FixtureChangedEvent],
        Sink.ignore,
        Sink.ignore)

      val (marketProbe, fixtureProbe, _, _) = graph.run()

      // When
      adapter.onOddsChange(input)

      // Then
      marketProbe.requestNext(expectationTimeout) shouldBe firstExpectedMarketChangedEvent
      marketProbe.requestNext(expectationTimeout) shouldBe secondExpectedMarketChangedEvent
      marketProbe.requestNext(expectationTimeout) shouldBe thirdExpectedMarketChangedEvent
      marketProbe.expectNoMessage(expectationTimeout)

      // sport_event_status produces a fixtureChangedEvent
      fixtureProbe.requestNext(expectationTimeout) shouldBe expectedFixtureChangedEvent
      fixtureProbe.expectNoMessage(expectationTimeout)
    }

    s"produce ${MarketSettlementEvent.simpleObjectName}s" in {

      // Given
      val oddinRestApi = createFailingClient(oddinConfig.apiConfig, StatusCodes.InternalServerError)

      val adapter = new OddinMessageAdapter(ConstantUUIDGenerator, clock)
      val oddinStreams =
        new OddinStreams(adapter, oddinRestApi, marketDescriptionsRepository)

      // And
      val input = BetSettlement(
        stringFromResource(baseDir = "data/akkastreams/market-settlement-flow", fileName = "bet-settlement.xml"))

      // And
      val graph =
        oddinStreams.buildRunnableGraph(
          parallelism,
          parallelism,
          Sink.ignore,
          Sink.ignore,
          TestSink.probe[MarketSettlementEvent],
          Sink.ignore)

      val (_, _, settlementProbe, _) = graph.run()

      // When
      adapter.onBetSettlement(input)

      // Then
      settlementProbe.requestNext(expectationTimeout) shouldBe firstExpectedMarketSettlementEvent
      settlementProbe.requestNext(expectationTimeout) shouldBe secondExpectedMarketSettlementEvent
      settlementProbe.expectNoMessage(expectationTimeout)
    }

    s"produce ${MarketCancelEvent.simpleObjectName}s" in {

      // Given
      val oddinRestApi = createFailingClient(oddinConfig.apiConfig, StatusCodes.InternalServerError)

      val adapter = new OddinMessageAdapter(ConstantUUIDGenerator, clock)
      val oddinStreams =
        new OddinStreams(adapter, oddinRestApi, marketDescriptionsRepository)

      // And
      val input =
        BetCancel(stringFromResource(baseDir = "data/akkastreams/market-cancel-flow", fileName = "bet-cancel.xml"))

      // And
      val graph =
        oddinStreams.buildRunnableGraph(
          parallelism,
          parallelism,
          Sink.ignore,
          Sink.ignore,
          Sink.ignore,
          TestSink.probe[MarketCancelEvent])

      val (_, _, _, cancelProbe) = graph.run()

      // When
      adapter.onBetCancel(input)

      // Then
      cancelProbe.requestNext(expectationTimeout) shouldBe expectedMarketCancelEvent
      cancelProbe.expectNoMessage(expectationTimeout)
    }
  }

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

  private val secondExpectedMarketChangedEvent = MarketChangedEvent(
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
        correlationId.value.toString,
        marketId = "od:match:19816:2:handicap=1.5",
        selectionId = 2,
        selectionName = "away",
        odds = Some("1.3000"),
        active = true),
      SelectionOdds(
        correlationId.value.toString,
        marketId = "od:match:19816:2:handicap=1.5",
        selectionId = 1,
        selectionName = "home",
        odds = Some("3.2400"),
        active = true)))

  private val thirdExpectedMarketChangedEvent = MarketChangedEvent(
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
        correlationId.value.toString,
        marketId = "od:match:19816:6:map=2|variant=way:two|way=two",
        selectionId = 2,
        selectionName = "away",
        odds = Some("1.9400"),
        active = true),
      SelectionOdds(
        correlationId.value.toString,
        marketId = "od:match:19816:6:map=2|variant=way:two|way=two",
        selectionId = 1,
        selectionName = "home",
        odds = Some("1.7900"),
        active = true)))

  private val firstExpectedMarketSettlementEvent = MarketSettlementEvent(
    correlationId = correlationId.value.toString,
    receivedAt.value.toEpochMilli,
    marketId = "od:match:23273:7:map=1|round=1",
    outcomes = Seq(SelectionResult(selectionId = 2, result = "LOST"), SelectionResult(selectionId = 1, result = "WON")))

  private val secondExpectedMarketSettlementEvent = MarketSettlementEvent(
    correlationId = correlationId.value.toString,
    receivedAtUtc = receivedAt.value.toEpochMilli,
    marketId = "od:match:23273:7:map=1|round=19",
    outcomes = Seq(SelectionResult(selectionId = 2, result = "WON"), SelectionResult(selectionId = 1, result = "LOST")))

  private val expectedMarketCancelEvent =
    MarketCancelEvent(
      correlationId.value.toString,
      receivedAt.value.toEpochMilli,
      "od:match:28570:15:map=2",
      isPush = false)
}
