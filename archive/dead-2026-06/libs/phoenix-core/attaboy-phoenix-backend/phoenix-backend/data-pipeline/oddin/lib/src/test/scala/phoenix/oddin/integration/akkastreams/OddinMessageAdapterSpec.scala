package phoenix.oddin.integration.akkastreams
import akka.actor.testkit.typed.scaladsl.ScalaTestWithActorTestKit
import akka.actor.typed.scaladsl.adapter._
import akka.stream.testkit.TestSubscriber.Probe
import akka.stream.testkit.scaladsl.TestSink
import org.scalatest.matchers.should.Matchers
import org.scalatest.wordspec.AnyWordSpecLike

import phoenix.core.odds.Odds
import phoenix.oddin.domain.MarketStatus.Settled
import phoenix.oddin.domain.OddinMessageHandler.BetCancel
import phoenix.oddin.domain.OddinMessageHandler.BetSettlement
import phoenix.oddin.domain.OddinMessageHandler.FixtureChange
import phoenix.oddin.domain.OddinMessageHandler.OddsChange
import phoenix.oddin.domain.OddinStreamingApi._
import phoenix.oddin.domain.VoidReason
import phoenix.oddin.domain._
import phoenix.oddin.domain.marketCancel
import phoenix.oddin.domain.marketCancel.MarketCancel
import phoenix.oddin.domain.marketChange.Market
import phoenix.oddin.domain.marketChange.Outcome
import phoenix.oddin.domain.marketChange.OutcomeActive.Active
import phoenix.oddin.domain.marketChange.OutcomeActive.Inactive
import phoenix.oddin.domain.marketChange.OutcomeOdds
import phoenix.oddin.domain.marketSettlement
import phoenix.oddin.domain.marketSettlement.MarketSettlement
import phoenix.oddin.domain.marketSettlement.Result.Lost
import phoenix.oddin.domain.marketSettlement.Result.Won
import phoenix.oddin.domain.sportEventStatusChange.SportEventStatusChange
import phoenix.oddin.infrastructure.OddinMessageAdapter
import phoenix.oddin.infrastructure.xml.UnsafeOddinValueObjectExtensions._
import phoenix.support.ConstantUUIDGenerator
import phoenix.support.FileSupport
import phoenix.time.FakeHardcodedClock

class OddinMessageAdapterSpec extends ScalaTestWithActorTestKit with AnyWordSpecLike with Matchers with FileSupport {

  implicit private val classicSystem = testKit.system.toClassic

  private val clock = new FakeHardcodedClock()

  private val correlationId = CorrelationId(ConstantUUIDGenerator.generate())
  private val receivedAt = ReceivedAt(clock.currentOffsetDateTime())

  private def createSources(): (
      OddinMessageAdapter,
      Probe[FixtureChangeMessage],
      Probe[OddsChangeMessage],
      Probe[MarketSettlementMessage],
      Probe[MarketCancelMessage]) = {
    val adapter = new OddinMessageAdapter(ConstantUUIDGenerator, clock)

    val fixtureChanges = adapter.fixtureChanges.runWith(TestSink.probe[FixtureChangeMessage])
    val marketChanges = adapter.oddsChanges.runWith(TestSink.probe[OddsChangeMessage])
    val marketSettlements = adapter.marketSettlements.runWith(TestSink.probe[MarketSettlementMessage])
    val marketCancellations = adapter.marketCancellations.runWith(TestSink.probe[MarketCancelMessage])

    (adapter, fixtureChanges, marketChanges, marketSettlements, marketCancellations)
  }

  "OddinMessageAdapter" should {

    "emit a FixtureChange message" in {

      // Given
      val (adapter, fixtureChanges, marketChanges, marketSettlements, marketCancellations) = createSources()

      // And
      val input = FixtureChange(
        stringFromResource(baseDir = "data/akkastreams/fixture-change-flow", fileName = "fixture-change.xml"))

      // When
      adapter.onFixtureChange(input)

      // Then
      fixtureChanges.requestNext(expectationTimeout) shouldBe expectedFixtureChangeMessage

      // And
      marketChanges.expectSubscription()
      marketChanges.expectNoMessage(expectationTimeout)

      // And
      marketSettlements.expectSubscription()
      marketSettlements.expectNoMessage(expectationTimeout)

      // And
      marketCancellations.expectSubscription()
      marketCancellations.expectNoMessage(expectationTimeout)
    }

    "emit a MarketChange message" in {

      // Given
      val (adapter, fixtureChanges, marketChanges, marketSettlements, marketCancellations) = createSources()

      // And

      val input =
        OddsChange(stringFromResource(baseDir = "data/akkastreams/market-change-flow", fileName = "odds-change.xml"))

      // When
      adapter.onOddsChange(input)

      // Then
      fixtureChanges.expectSubscription()
      fixtureChanges.expectNoMessage(expectationTimeout)

      // And
      marketChanges.requestNext(expectationTimeout) shouldBe expectedMarketChangeMessage

      // And
      marketSettlements.expectSubscription()
      marketSettlements.expectNoMessage(expectationTimeout)

      // And
      marketCancellations.expectSubscription()
      marketCancellations.expectNoMessage(expectationTimeout)
    }

    "emit a MarketSettlement message" in {

      // Given
      val (adapter, fixtureChanges, marketChanges, marketSettlements, marketCancellations) = createSources()

      // And

      val input =
        BetSettlement(
          stringFromResource(baseDir = "data/akkastreams/market-settlement-flow", fileName = "bet-settlement.xml"))

      // When
      adapter.onBetSettlement(input)

      // Then
      fixtureChanges.expectSubscription()
      fixtureChanges.expectNoMessage(expectationTimeout)

      // And
      marketChanges.expectSubscription()
      marketChanges.expectNoMessage(expectationTimeout)

      // And
      marketSettlements.requestNext(expectationTimeout) shouldBe expectedMarketSettlementMessage

      // And
      marketCancellations.expectSubscription()
      marketCancellations.expectNoMessage(expectationTimeout)
    }

    "emit a MarketCancel message" in {

      // Given
      val (adapter, fixtureChanges, marketChanges, marketSettlements, marketCancellations) = createSources()

      // And

      val input =
        BetCancel(stringFromResource(baseDir = "data/akkastreams/market-cancel-flow", fileName = "bet-cancel.xml"))

      // When
      adapter.onBetCancel(input)

      // Then
      fixtureChanges.expectSubscription()
      fixtureChanges.expectNoMessage(expectationTimeout)

      // And
      marketChanges.expectSubscription()
      marketChanges.expectNoMessage(expectationTimeout)

      // And
      marketSettlements.expectSubscription()
      marketSettlements.expectNoMessage(expectationTimeout)

      // And
      marketCancellations.requestNext(expectationTimeout) shouldBe expectedMarketCancelMessage
    }
  }

  private val expectedFixtureChangeMessage: FixtureChangeMessage =
    OddinMessage(
      correlationId,
      receivedAt,
      fixtureChange.FixtureChange(OddinSportEventId.fromStringUnsafe("od:match:19816")))

  private val expectedMarketChangeMessage: OddsChangeMessage = OddinMessage(
    correlationId,
    receivedAt,
    oddsChange.OddsChange(
      Some(
        SportEventStatusChange(
          OddinSportEventId.fromStringUnsafe("od:match:19816"),
          HomeScore(4),
          AwayScore(5),
          FixtureStatus.NOT_STARTED)),
      marketChange.MarketChange(
        OddinSportEventId.fromStringUnsafe("od:match:19816"),
        List(
          Market(
            MarketDescriptionId(27),
            MarketSpecifiers.fromStringUnsafe("map=3|threshold=36"),
            MarketStatus.Suspended,
            List(Outcome(OutcomeId(5), None, Inactive), Outcome(OutcomeId(4), None, Inactive))),
          Market(
            MarketDescriptionId(2),
            MarketSpecifiers.fromStringUnsafe("handicap=1.5"),
            MarketStatus.Active,
            List(
              Outcome(OutcomeId(2), Some(OutcomeOdds(Odds(1.3000))), Active),
              Outcome(OutcomeId(1), Some(OutcomeOdds(Odds(3.2400))), Active))),
          Market(
            MarketDescriptionId(6),
            MarketSpecifiers.fromStringUnsafe("variant=way:two|map=2|way=two"),
            MarketStatus.Active,
            List(
              Outcome(OutcomeId(2), Some(OutcomeOdds(Odds(1.9400))), Active),
              Outcome(OutcomeId(1), Some(OutcomeOdds(Odds(1.7900))), Active)))))))

  private val expectedMarketSettlementMessage: MarketSettlementMessage =
    OddinMessage(
      correlationId,
      receivedAt,
      MarketSettlement(
        OddinSportEventId.fromStringUnsafe("od:match:23273"),
        List(
          marketSettlement.Market(
            MarketDescriptionId(7),
            MarketSpecifiers.fromStringUnsafe("map=1|round=1"),
            Settled,
            List(marketSettlement.Outcome(OutcomeId(2), Lost), marketSettlement.Outcome(OutcomeId(1), Won))),
          marketSettlement.Market(
            MarketDescriptionId(7),
            MarketSpecifiers.fromStringUnsafe("map=1|round=19"),
            Settled,
            List(marketSettlement.Outcome(OutcomeId(2), Won), marketSettlement.Outcome(OutcomeId(1), Lost))))))

  private val expectedMarketCancelMessage: MarketCancelMessage =
    OddinMessage(
      correlationId,
      receivedAt,
      MarketCancel(
        OddinSportEventId.fromStringUnsafe("od:match:28570"),
        List(
          marketCancel.Market(
            MarketDescriptionId(15),
            MarketSpecifiers.fromStringUnsafe("map=2"),
            voidReason = VoidReason.Unknown))))
}
