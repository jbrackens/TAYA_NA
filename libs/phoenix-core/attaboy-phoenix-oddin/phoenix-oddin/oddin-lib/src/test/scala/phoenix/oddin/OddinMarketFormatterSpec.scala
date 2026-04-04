package phoenix.oddin

import java.util.UUID

import org.scalatest.matchers.must.Matchers
import org.scalatest.wordspec.AnyWordSpecLike
import phoenix.test.FileSupport

class OddinMarketFormatterSpec extends AnyWordSpecLike with Matchers with FileSupport {
  import OddinMarketFormatterSpec._

  "OddinMarketFormatter" should {

    "format a market name string using provided specifiers" in {
      val str = "Total kills {threshold} - map {map}"
      val specifiers = Map("threshold" -> "12", "map" -> "3")

      OddinMarketFormatter.formatMarketName(str, specifiers) must be("Total kills 12 - map 3")
    }

    "create MarketOddsChange events" in {
      val marketDescriptionsXml = xml(MarketDescriptionsXmlFileName)
      val marketDescriptions = OddinXmlParsing.parseMarketDescriptions(marketDescriptionsXml)

      val oddsChange =
        OddinXmlParsing.parseOddsChange(UUID.randomUUID().toString, getStringFromFile(OddsChangeXmlFileName))

      val fixtureXml = xml(FixtureXmlFileName)
      val fixture = OddinXmlParsing.parseFixture(fixtureXml)

      val marketOddsChanges = OddinMarketFormatter.toMarketOddsChanges(oddsChange, fixture, marketDescriptions)
    }
  }
}

object OddinMarketFormatterSpec {

  val MarketDescriptionsXmlFileName = "list-market-descriptions-response.xml"
  val OddsChangeXmlFileName = "odds-change.xml"
  val FixtureXmlFileName = "fixture.xml"
}
