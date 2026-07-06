package phoenix.oddin.infrastructure.xml

import cats.syntax.apply._

import phoenix.core.XmlUtils.DefaultXmlAttributeReaders._
import phoenix.core.XmlUtils._
import phoenix.oddin.domain.MarketDescriptionId
import phoenix.oddin.domain.MarketSpecifiers
import phoenix.oddin.domain.OddinSportEventId
import phoenix.oddin.domain.VoidReason
import phoenix.oddin.domain.marketCancel.Market
import phoenix.oddin.domain.marketCancel.MarketCancel
import phoenix.oddin.infrastructure.xml.OddsChangeXmlReaders.marketSpecifiersReader
import phoenix.oddin.infrastructure.xml.XmlReaderSupport.marketDescriptionIdReader
import phoenix.oddin.infrastructure.xml.XmlReaderSupport.sportEventIdReader

object MarketCancelXmlReaders {

  implicit val marketReader: XmlNodeReader[Market] =
    node => {
      val idResult = node.readAttribute[MarketDescriptionId]
      val specifiersResult = node.readAttribute[MarketSpecifiers]
      val voidReason = node
        .readAttributeForName[Option[Int]]("void_reason")
        .map(_.fold[VoidReason](VoidReason.Unknown)(VoidReason.fromInt))

      (idResult, specifiersResult, voidReason).mapN(Market.apply)
    }

  implicit val marketCancelReader: XmlNodeReader[MarketCancel] =
    node => {
      val eventIdResult = node.readAttribute[OddinSportEventId]
      val marketsResult = node.convertDescendantsTo[Market](Elements.Market)

      (eventIdResult, marketsResult).mapN(MarketCancel.apply)
    }
}
