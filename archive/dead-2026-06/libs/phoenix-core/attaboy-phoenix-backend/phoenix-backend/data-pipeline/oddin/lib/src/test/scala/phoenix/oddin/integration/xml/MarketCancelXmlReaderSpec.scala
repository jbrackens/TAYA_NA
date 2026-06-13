package phoenix.oddin.integration.xml

import cats.data.Validated.Valid
import org.scalatest.matchers.should.Matchers
import org.scalatest.wordspec.AnyWordSpecLike

import phoenix.core.XmlUtils._
import phoenix.oddin.domain.MarketDescriptionId
import phoenix.oddin.domain.MarketSpecifiers
import phoenix.oddin.domain.OddinSportEventId
import phoenix.oddin.domain.VoidReason
import phoenix.oddin.domain.marketCancel.Market
import phoenix.oddin.domain.marketCancel.MarketCancel
import phoenix.oddin.infrastructure.xml.MarketCancelXmlReaders._
import phoenix.oddin.infrastructure.xml.UnsafeOddinValueObjectExtensions._

class MarketCancelXmlReaderSpec extends AnyWordSpecLike with Matchers {

  "read a market cancel message with Unknown void reason" in {
    val marketCancel =
      <bet_cancel timestamp="1617099742376" product="2" event_id="od:match:28570">
        <market id="15" specifiers="map=2" ></market>
      </bet_cancel>.convertTo[MarketCancel]

    val expected = Valid(
      MarketCancel(
        OddinSportEventId.fromStringUnsafe(value = "od:match:28570"),
        List(
          Market(
            MarketDescriptionId(15),
            MarketSpecifiers.fromStringUnsafe(value = "map=2"),
            voidReason = VoidReason.Unknown))))

    marketCancel shouldBe expected
  }

  "read a market cancel message with Push void reason" in {
    val marketCancel =
      <bet_cancel timestamp="1617099742376" product="2" event_id="od:match:28570">
        <market id="15" specifiers="map=2" void_reason="1"></market>
      </bet_cancel>.convertTo[MarketCancel]

    val expected = Valid(
      MarketCancel(
        OddinSportEventId.fromStringUnsafe(value = "od:match:28570"),
        List(
          Market(
            MarketDescriptionId(15),
            MarketSpecifiers.fromStringUnsafe(value = "map=2"),
            voidReason = VoidReason.Push))))

    marketCancel shouldBe expected
  }
}
