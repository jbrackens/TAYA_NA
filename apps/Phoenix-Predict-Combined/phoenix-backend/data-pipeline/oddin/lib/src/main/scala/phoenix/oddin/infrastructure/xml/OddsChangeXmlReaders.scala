package phoenix.oddin.infrastructure.xml
import cats.syntax.apply._
import cats.syntax.validated._

import phoenix.core.XmlUtils.DefaultXmlAttributeReaders.bigDecimalXmlAttributeReader
import phoenix.core.XmlUtils.DefaultXmlAttributeReaders.intAttributeReader
import phoenix.core.XmlUtils.DefaultXmlAttributeReaders.optionalAttributeReader
import phoenix.core.XmlUtils.DefaultXmlAttributeReaders.stringAttributeReader
import phoenix.core.XmlUtils._
import phoenix.core.odds.Odds
import phoenix.oddin.domain._
import phoenix.oddin.domain.marketChange._
import phoenix.oddin.domain.oddsChange.OddsChange
import phoenix.oddin.domain.sportEventStatusChange.SportEventStatusChange
import phoenix.oddin.infrastructure.xml.SportEventXmlReaders.awayScoreReader
import phoenix.oddin.infrastructure.xml.SportEventXmlReaders.homeScoreReader
import phoenix.oddin.infrastructure.xml.XmlReaderSupport.marketDescriptionIdReader
import phoenix.oddin.infrastructure.xml.XmlReaderSupport.outcomeIdReader
import phoenix.oddin.infrastructure.xml.XmlReaderSupport.sportEventIdReader
import phoenix.oddin.infrastructure.xml.XmlReaderSupport.xmlErrorOr

object OddsChangeXmlReaders {

  implicit val oddsReader: XmlAttributeReader[Odds] =
    node => node.readAttributeForName[BigDecimal](Attributes.Odds).map(Odds.apply)

  implicit val outcomeOddsReader: XmlAttributeReader[OutcomeOdds] =
    node => node.readAttribute[Odds].map(OutcomeOdds)

  implicit val outcomeActiveReader: XmlAttributeReader[OutcomeActive] =
    node =>
      node.readAttributeForName[Int](Attributes.Active).andThen(intValue => xmlErrorOr(OutcomeActive.fromInt, intValue))

  implicit val outcomeReader: XmlNodeReader[Outcome] =
    node => {
      val idResult = node.readAttribute[OutcomeId]
      val oddsResult = node.readAttribute[Option[OutcomeOdds]]
      val activeResult = node.readAttribute[OutcomeActive]

      (idResult, oddsResult, activeResult).mapN(Outcome)
    }

  implicit val marketSpecifiersReader: XmlAttributeReader[MarketSpecifiers] =
    node =>
      node
        .readAttributeForName[String](Attributes.Specifiers)
        .andThen(strValue => xmlErrorOr(MarketSpecifiers.fromString, strValue))

  implicit val marketStatusReader: XmlAttributeReader[MarketStatus] =
    node =>
      node.readAttributeForName[Int](Attributes.Status).andThen(intValue => xmlErrorOr(MarketStatus.fromInt, intValue))

  implicit val marketReader: XmlNodeReader[Market] =
    node => {
      val marketIdResult = node.readAttribute[MarketDescriptionId]
      val marketSpecifiersResult = node.readAttribute[MarketSpecifiers]
      val marketStatusResult = node.readAttribute[MarketStatus]
      val outcomesResult = node.convertDescendantsTo[Outcome](Elements.Outcome)

      (marketIdResult, marketSpecifiersResult, marketStatusResult, outcomesResult).mapN(Market)
    }

  implicit val marketChangeReader: XmlNodeReader[MarketChange] =
    node => {
      val eventIdResult = node.readAttribute[OddinSportEventId]
      val marketsResult = node.convertDescendantsTo[Market](Elements.Market)

      (eventIdResult, marketsResult).mapN(MarketChange)
    }

  implicit val fixtureStatusReader: XmlAttributeReader[FixtureStatus] =
    node =>
      node
        .readAttributeForName[String](Attributes.Status)
        .andThen(strValue => xmlErrorOr(FixtureStatus.fromString, strValue))

  implicit val oddsChangeReader: XmlNodeReader[OddsChange] =
    node => {
      val sportEventStatusChange: ValidationResult[Option[SportEventStatusChange]] = {
        node.child
          .find(_.label == Elements.SportEventStatus)
          .map { eventNode =>
            val eventIdResult = node.readAttribute[OddinSportEventId]

            val homeScore = eventNode.readAttribute[HomeScore]
            val awayScore = eventNode.readAttribute[AwayScore]
            val matchStatus = eventNode.readAttribute[FixtureStatus]
            (eventIdResult, homeScore, awayScore, matchStatus).mapN(SportEventStatusChange)
          }
          .fold[ValidationResult[Option[SportEventStatusChange]]](None.valid)(validation => validation.map(Some(_)))
      }
      val marketChange = node.convertTo[MarketChange]

      (sportEventStatusChange, marketChange).mapN(OddsChange)
    }
}
