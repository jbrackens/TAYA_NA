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
import phoenix.dataapi.internal.oddin.MarketCancelEvent
import phoenix.oddin.domain.OddinStreamingApi._
import phoenix.oddin.domain.marketCancel.MarketCancel
import phoenix.oddin.domain.marketSettlement.MarketSettlement
import phoenix.oddin.infrastructure.akkastreams.MarketCancelFlow
import phoenix.oddin.infrastructure.xml.MarketCancelXmlReaders._
import phoenix.support.ConstantUUIDGenerator
import phoenix.support.FileSupport
import phoenix.time.FakeHardcodedClock

class MarketCancelFlowSpec extends ScalaTestWithActorTestKit with AnyWordSpecLike with Matchers with FileSupport {

  private implicit val typedSystem = system

  private val clock = new FakeHardcodedClock()

  private val correlationId = CorrelationId(ConstantUUIDGenerator.generate())
  private val receivedAt = ReceivedAt(clock.currentOffsetDateTime())

  s"${MarketCancelFlow.simpleObjectName}" should {

    s"emit ${MarketSettlement.simpleObjectName}s" in {

      // Given
      val marketCancelInput = marketCancelFile("bet-cancel.xml").parseXml
        .convertTo[MarketCancel]
        .getOrElse(fail("failed to read market cancel from file"))
      val input = OddinMessage(correlationId, receivedAt, payload = marketCancelInput)
      val sink = createSink(input, MarketCancelFlow())

      // When
      sink.request(2)

      // Then
      sink.expectNext(expectationTimeout) shouldBe expectedMarketChangedEvent
    }
  }

  private def createSink(input: MarketCancelMessage, marketCancelFlow: MarketCancelFlow): Probe[MarketCancelEvent] =
    Source.single(input).via(marketCancelFlow).runWith(TestSink.probe[MarketCancelEvent](system.toClassic))

  private def marketCancelFile(fileName: String): String =
    stringFromResource(baseDir = "data/akkastreams/market-cancel-flow", fileName)

  private val expectedMarketChangedEvent: MarketCancelEvent =
    MarketCancelEvent(
      correlationId.value.toString,
      receivedAt.value.toEpochMilli,
      "od:match:28570:15:map=2",
      isPush = false)
}
