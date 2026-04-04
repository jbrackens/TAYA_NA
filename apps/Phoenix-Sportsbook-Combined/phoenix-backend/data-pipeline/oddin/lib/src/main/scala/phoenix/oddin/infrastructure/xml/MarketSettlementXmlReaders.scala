package phoenix.oddin.infrastructure.xml

import cats.syntax.apply._

import phoenix.core.XmlUtils.DefaultXmlAttributeReaders.intAttributeReader
import phoenix.core.XmlUtils._
import phoenix.oddin.domain.MarketDescriptionId
import phoenix.oddin.domain.MarketSpecifiers
import phoenix.oddin.domain.MarketStatus
import phoenix.oddin.domain.OddinSportEventId
import phoenix.oddin.domain.OutcomeId
import phoenix.oddin.domain.marketSettlement.Market
import phoenix.oddin.domain.marketSettlement.MarketSettlement
import phoenix.oddin.domain.marketSettlement.Outcome
import phoenix.oddin.domain.marketSettlement.Result
import phoenix.oddin.infrastructure.xml.OddsChangeXmlReaders.marketSpecifiersReader
import phoenix.oddin.infrastructure.xml.XmlReaderSupport.marketDescriptionIdReader
import phoenix.oddin.infrastructure.xml.XmlReaderSupport.outcomeIdReader
import phoenix.oddin.infrastructure.xml.XmlReaderSupport.sportEventIdReader
import phoenix.oddin.infrastructure.xml.XmlReaderSupport.xmlErrorOr

object MarketSettlementXmlReaders {

  implicit val marketStatusReader: XmlAttributeReader[MarketStatus] =
    node =>
      node.readAttributeForName[Int](Attributes.Status).andThen(intValue => xmlErrorOr(MarketStatus.fromInt, intValue))

  implicit val resultReader: XmlAttributeReader[Result] =
    node => node.readAttributeForName[Int](Attributes.Result).andThen(intValue => xmlErrorOr(Result.fromInt, intValue))

  implicit val outcomeReader: XmlNodeReader[Outcome] =
    node => {
      val idResult = node.readAttribute[OutcomeId]
      val resultResult = node.readAttribute[Result]

      (idResult, resultResult).mapN(Outcome.apply _)
    }

  implicit val marketReader: XmlNodeReader[Market] =
    node => {
      val marketIdResult = node.readAttribute[MarketDescriptionId]
      val marketSpecifiersResult = node.readAttribute[MarketSpecifiers]
      val marketStatusResult = node.readAttribute[MarketStatus]
      val outcomesResult = node.convertDescendantsTo[Outcome](Elements.Outcome)

      (marketIdResult, marketSpecifiersResult, marketStatusResult, outcomesResult).mapN(Market.apply _)
    }

  implicit val marketSettlementReader: XmlNodeReader[MarketSettlement] = node => {

    val eventIdResult = node.readAttribute[OddinSportEventId]
    val marketsResult = node.convertDescendantsTo[Market](Elements.Market)

    (eventIdResult, marketsResult).mapN(MarketSettlement.apply _)
  }
}
