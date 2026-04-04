package phoenix.betgenius.domain

import io.scalaland.chimney.dsl._
import org.scalatest.LoneElement
import org.scalatest.OptionValues
import org.scalatest.matchers.should.Matchers
import org.scalatest.prop.TableDrivenPropertyChecks
import org.scalatest.wordspec.AnyWordSpec

import phoenix.core.Clock
import phoenix.dataapi.shared
import phoenix.dataapi.shared.MarketChange
import phoenix.dataapi.shared.MarketStatus
import phoenix.dataapi.shared.OddData
import phoenix.dataapi.shared.Specifiers
import phoenix.support.ConstantUUIDGenerator

class MarketSetIngestTransformerSpec
    extends AnyWordSpec
    with Matchers
    with OptionValues
    with TableDrivenPropertyChecks
    with LoneElement {

  "MarketSetIngest transformer" should {

    "Transform into MarketChange" in {

      // given
      val timestamp = Clock.utcClock.currentOffsetDateTime()
      val marketSetIngest = MarketSetIngest(
        Header(ConstantUUIDGenerator.constantUUID, timestamp),
        MarketSet(FixtureId(1), Seq(marketTemplate.copy(expiryUtc = timestamp))))

      // when
      val marketChange = marketSetIngest.transformInto[Seq[MarketChange]]

      // then
      marketChange.head.header shouldBe shared.Header(
        ConstantUUIDGenerator.constantUUID.toString,
        timestamp.toInstant,
        "betgenius")
      marketChange.head.namespacedFixtureId shouldBe "f:b:1"
      marketChange.head.market shouldBe shared.Market(
        "m:b:2",
        "MarketName",
        MarketStatus.Bettable,
        "MAP_DURATION",
        None,
        Specifiers(Some("5"), Some("4"), Some("minutes")),
        Seq(OddData("sn:b:4", "Over 5 Minutes", Some("1.1"), active = true)))

    }

    "Map the specifiers" in {
      // @formatter:off
      val specifiersTable = Table(
        ("MarketTypeName",                   "Handicap",  "Outcome",                          "Expected"                             ),
        ("Map 3 Team to Win the Next Round", None,        None,                               Specifiers(None, Some("3"), None)      ),
        ("Team to Score a Penta Kill",       Some("1.5"), None,                               Specifiers(Some("1.5"),  None, None)   ),
        ("Team to Score a Penta Kill",       None,        Some(Outcome(2, "Over 5 Minutes")), Specifiers(None, None, Some("minutes"))),
        ("Team to Score a Penta Kill",       None,        None,                               Specifiers(None, None, None)           ))
      // @formatter:on

      forAll(specifiersTable) {
        case (marketTypeName, handicap, outcome, expected) =>
          val marketSetIngest = MarketSetIngest(
            Header(ConstantUUIDGenerator.constantUUID, Clock.utcClock.currentOffsetDateTime()),
            MarketSet(
              FixtureId(1),
              Seq(
                marketTemplate.copy(
                  handicap = handicap,
                  marketType = MarketType(MarketTypeId(1), MarketTypeName(marketTypeName)),
                  selections = Seq(selectionTemplate.copy(outcome = outcome))))))

          val transformedMarket = marketSetIngest.transformInto[Seq[MarketChange]].loneElement.market
          transformedMarket.specifiers shouldBe expected
      }
    }

    "Map the selection name" in {
      // @formatter:off
      val selectionTable = Table(
        ("Outcome",                "Range",               "Expected"),
        (Some(Outcome(3, "Home")), None,                  "Home"    ),
        (None,                     Some(Range("3", "0")), "3:0"     )
      )
      // @formatter:on

      forAll(selectionTable) {
        case (outcome, range, expected) =>
          val oddData = selectionTemplate.copy(outcome = outcome, range = range).transformInto[OddData]

          oddData.selectionName shouldBe expected
      }
    }

    "Throw exception if the selection name cannot be built" in {
      val selection = selectionTemplate.copy(outcome = None, range = None)

      intercept[RuntimeException] {
        selection.transformInto[OddData]
      }
    }

    def marketTemplate =
      Market(
        MarketId(2),
        Clock.utcClock.currentOffsetDateTime(),
        inPlay = true,
        MarketType(MarketTypeId(3), MarketTypeName("Map 4 Game Time Over/Under")),
        MarketName("MarketName"),
        Seq(selectionTemplate),
        Some("5"),
        TradingStatus.Open)

    def selectionTemplate =
      Selection(
        SelectionId(4),
        CompetitorId(5),
        DecimalOdds(BigDecimal("1.1")),
        Denominator(1),
        Numerator(10),
        Some(Outcome(6, "Over 5 Minutes")),
        Some(Range(low = "2", high = "3")),
        SelectionStatus.Trading)
  }
}
