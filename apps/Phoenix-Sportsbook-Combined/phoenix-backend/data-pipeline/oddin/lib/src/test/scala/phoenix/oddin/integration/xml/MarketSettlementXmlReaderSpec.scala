package phoenix.oddin.integration.xml

import cats.data.Validated.Valid
import org.scalatest.matchers.should.Matchers
import org.scalatest.wordspec.AnyWordSpecLike

import phoenix.core.XmlUtils._
import phoenix.oddin.domain.MarketDescriptionId
import phoenix.oddin.domain.MarketSpecifiers
import phoenix.oddin.domain.MarketStatus.Settled
import phoenix.oddin.domain.OddinSportEventId
import phoenix.oddin.domain.OutcomeId
import phoenix.oddin.domain.marketSettlement.Market
import phoenix.oddin.domain.marketSettlement.MarketSettlement
import phoenix.oddin.domain.marketSettlement.Outcome
import phoenix.oddin.domain.marketSettlement.Result.Lost
import phoenix.oddin.domain.marketSettlement.Result.Won
import phoenix.oddin.infrastructure.xml.MarketSettlementXmlReaders._
import phoenix.oddin.infrastructure.xml.UnsafeOddinValueObjectExtensions.UnsafeMarketSpecifiersOps
import phoenix.oddin.infrastructure.xml.UnsafeOddinValueObjectExtensions.UnsafeSportEventIdOps
import phoenix.support.FileSupport

class MarketSettlementXmlReaderSpec extends AnyWordSpecLike with Matchers with FileSupport {

  "read a market settlement message" in {
    val marketSettlement =
      stringFromResource(baseDir = "data/amq", fileName = "market-settlement.xml").parseXml.convertTo[MarketSettlement]

    marketSettlement shouldBe expectedMarketSettlement
  }

  private val expectedMarketSettlement = Valid(
    MarketSettlement(
      OddinSportEventId.fromStringUnsafe(value = "od:match:23273"),
      List(
        Market(
          MarketDescriptionId(7),
          MarketSpecifiers.fromStringUnsafe("map=1|round=1"),
          Settled,
          List(Outcome(OutcomeId(2), Lost), Outcome(OutcomeId(1), Won))))))
}
