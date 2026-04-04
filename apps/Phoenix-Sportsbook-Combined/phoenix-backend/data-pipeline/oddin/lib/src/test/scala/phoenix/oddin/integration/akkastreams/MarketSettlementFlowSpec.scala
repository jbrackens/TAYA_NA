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
import phoenix.dataapi.internal.phoenix.MarketSettlementEvent
import phoenix.dataapi.internal.phoenix.SelectionResult
import phoenix.oddin.domain.OddinStreamingApi.CorrelationId
import phoenix.oddin.domain.OddinStreamingApi.MarketSettlementFlow
import phoenix.oddin.domain.OddinStreamingApi.MarketSettlementMessage
import phoenix.oddin.domain.OddinStreamingApi.OddinMessage
import phoenix.oddin.domain.OddinStreamingApi.ReceivedAt
import phoenix.oddin.domain.marketSettlement.MarketSettlement
import phoenix.oddin.infrastructure.akkastreams.MarketSettlementFlow
import phoenix.oddin.infrastructure.xml.MarketSettlementXmlReaders._
import phoenix.support.ConstantUUIDGenerator
import phoenix.support.FileSupport
import phoenix.time.FakeHardcodedClock

class MarketSettlementFlowSpec extends ScalaTestWithActorTestKit with AnyWordSpecLike with Matchers with FileSupport {

  private implicit val typedSystem = system

  private val clock = new FakeHardcodedClock()

  private val correlationId = CorrelationId(ConstantUUIDGenerator.generate())
  private val receivedAt = ReceivedAt(clock.currentOffsetDateTime())

  s"${MarketSettlementFlow.simpleObjectName}" should {

    s"emit ${MarketSettlementEvent.simpleObjectName}s" in {

      // Given
      val marketSettlementInput = marketSettlementFile("bet-settlement.xml").parseXml
        .convertTo[MarketSettlement]
        .getOrElse(fail("failed to read market settlement from file"))
      val input = OddinMessage(correlationId, receivedAt, payload = marketSettlementInput)
      val sink = createSink(input, MarketSettlementFlow())

      // When
      sink.request(2)

      // Then
      sink.expectNext(expectationTimeout) shouldBe firstExpectedMarketChangedEvent
      sink.expectNext(expectationTimeout) shouldBe secondExpectedMarketChangedEvent
    }
  }

  private def createSink(
      input: MarketSettlementMessage,
      marketSettlementFlow: MarketSettlementFlow): Probe[MarketSettlementEvent] =
    Source.single(input).via(marketSettlementFlow).runWith(TestSink.probe[MarketSettlementEvent](system.toClassic))

  private def marketSettlementFile(fileName: String): String =
    stringFromResource(baseDir = "data/akkastreams/market-settlement-flow", fileName)

  private val firstExpectedMarketChangedEvent: MarketSettlementEvent =
    MarketSettlementEvent(
      correlationId.value.toString,
      receivedAt.value.toEpochMilli,
      "od:match:23273:7:map=1|round=1",
      Seq(SelectionResult(2, "LOST"), SelectionResult(1, "WON")))

  private val secondExpectedMarketChangedEvent: MarketSettlementEvent =
    MarketSettlementEvent(
      correlationId.value.toString,
      receivedAt.value.toEpochMilli,
      "od:match:23273:7:map=1|round=19",
      Seq(SelectionResult(2, "WON"), SelectionResult(1, "LOST")))
}
