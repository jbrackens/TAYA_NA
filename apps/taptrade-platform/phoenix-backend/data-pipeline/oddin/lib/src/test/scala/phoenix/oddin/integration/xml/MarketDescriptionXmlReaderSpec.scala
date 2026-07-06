package phoenix.oddin.integration.xml

import cats.data.Validated.Valid
import org.scalatest.matchers.should.Matchers
import org.scalatest.wordspec.AnyWordSpecLike

import phoenix.core.XmlUtils._
import phoenix.oddin.domain.MarketDescriptionId
import phoenix.oddin.domain.OutcomeId
import phoenix.oddin.domain.OutcomeName
import phoenix.oddin.domain.marketDescription.MarketDescription
import phoenix.oddin.domain.marketDescription.MarketDescriptionName
import phoenix.oddin.domain.marketDescription.MarketVariant
import phoenix.oddin.domain.marketDescription.Outcome
import phoenix.oddin.infrastructure.xml.MarketDescriptionXmlReaders._
import phoenix.support.FileSupport

class MarketDescriptionXmlReaderSpec extends AnyWordSpecLike with Matchers with FileSupport {

  "read a market description" in {
    val marketDescription = stringFromResource(baseDir = "data/domain", fileName = "market-description.xml").parseXml
      .convertTo[MarketDescription]

    marketDescription shouldBe expectedMarketDescription
  }

  private val expectedMarketDescription = Valid(
    MarketDescription(
      MarketDescriptionId(1),
      MarketDescriptionName("Match winner - {way}way"),
      Some(MarketVariant("way:two")),
      List(Outcome(OutcomeId(1), OutcomeName("home")), Outcome(OutcomeId(2), OutcomeName("away")))))
}
