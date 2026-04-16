package phoenix.oddin.integration.xml

import cats.data.Validated.Valid
import org.scalatest.matchers.should.Matchers
import org.scalatest.wordspec.AnyWordSpecLike

import phoenix.core.XmlUtils._
import phoenix.core.odds.Odds
import phoenix.oddin.domain.MarketStatus.Active
import phoenix.oddin.domain.MarketStatus.Suspended
import phoenix.oddin.domain._
import phoenix.oddin.domain.marketChange._
import phoenix.oddin.domain.oddsChange.OddsChange
import phoenix.oddin.domain.sportEventStatusChange.SportEventStatusChange
import phoenix.oddin.infrastructure.xml.OddsChangeXmlReaders._
import phoenix.oddin.infrastructure.xml.UnsafeOddinValueObjectExtensions.UnsafeMarketSpecifiersOps
import phoenix.oddin.infrastructure.xml.UnsafeOddinValueObjectExtensions.UnsafeSportEventIdOps
import phoenix.support.FileSupport

class OddsChangeXmlReaderSpec extends AnyWordSpecLike with Matchers with FileSupport {

  "read an odds change message with sport event status" in {
    val oddsChange =
      stringFromResource(baseDir = "data/amq", fileName = "odds-change.xml").parseXml.convertTo[OddsChange]

    oddsChange shouldBe expectedOddsChange(true)
  }

  "read an odds change message without sport event status" in {
    val oddsChange =
      stringFromResource(baseDir = "data/amq", fileName = "odds-change-no-sport-event-status.xml").parseXml
        .convertTo[OddsChange]

    oddsChange shouldBe expectedOddsChange()
  }

  private def expectedOddsChange(withSportEventStatus: Boolean = false) =
    Valid(
      OddsChange(
        if (withSportEventStatus)
          Some(
            SportEventStatusChange(
              OddinSportEventId.fromStringUnsafe(value = "od:match:19816"),
              HomeScore(4),
              AwayScore(5),
              FixtureStatus.NOT_STARTED))
        else
          None,
        MarketChange(
          OddinSportEventId.fromStringUnsafe(value = "od:match:19816"),
          List(
            Market(
              MarketDescriptionId(27),
              MarketSpecifiers.fromStringUnsafe(value = "threshold=36|map=3"),
              Suspended,
              List(
                Outcome(OutcomeId(5), None, OutcomeActive.Inactive),
                Outcome(OutcomeId(4), None, OutcomeActive.Inactive))),
            Market(
              MarketDescriptionId(2),
              MarketSpecifiers.fromStringUnsafe(value = "handicap=1.5"),
              Active,
              List(
                Outcome(OutcomeId(2), Some(OutcomeOdds(Odds(1.3000))), OutcomeActive.Active),
                Outcome(OutcomeId(1), Some(OutcomeOdds(Odds(3.2400))), OutcomeActive.Active)))))))
}
