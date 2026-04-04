package phoenix.oddin.infrastructure.xml

import cats.syntax.apply._

import phoenix.core.XmlUtils.DefaultXmlAttributeReaders.optionalAttributeReader
import phoenix.core.XmlUtils.DefaultXmlAttributeReaders.stringAttributeReader
import phoenix.core.XmlUtils._
import phoenix.oddin.domain.MarketDescriptionId
import phoenix.oddin.domain.OutcomeId
import phoenix.oddin.domain.OutcomeName
import phoenix.oddin.domain.marketDescription.MarketDescription
import phoenix.oddin.domain.marketDescription.MarketDescriptionName
import phoenix.oddin.domain.marketDescription.MarketVariant
import phoenix.oddin.domain.marketDescription.Outcome
import phoenix.oddin.infrastructure.xml.XmlReaderSupport.marketDescriptionIdReader
import phoenix.oddin.infrastructure.xml.XmlReaderSupport.outcomeIdReader
import phoenix.oddin.infrastructure.xml.XmlReaderSupport.outcomeNameReader

object MarketDescriptionXmlReaders {

  implicit val marketDescriptionNameReader: XmlAttributeReader[MarketDescriptionName] =
    node => node.readAttributeForName[String](Attributes.Name).map(MarketDescriptionName)

  implicit val marketDescriptionVariantReader: XmlAttributeReader[MarketVariant] =
    node => node.readAttributeForName[String](Attributes.Variant).map(MarketVariant)

  implicit val marketDescriptionOutcomeReader: XmlNodeReader[Outcome] =
    node => {
      val idResult = node.readAttribute[OutcomeId]
      val nameResult = node.readAttribute[OutcomeName]

      (idResult, nameResult).mapN(Outcome.apply _)
    }

  implicit val marketDescriptionReader: XmlNodeReader[MarketDescription] =
    node => {
      val idResult = node.readAttribute[MarketDescriptionId]
      val nameResult = node.readAttribute[MarketDescriptionName]
      val variantResult = node.readAttribute[Option[MarketVariant]]
      val outcomesResult = node.convertDescendantsTo[Outcome](Elements.Outcome)

      (idResult, nameResult, variantResult, outcomesResult).mapN(MarketDescription.apply _)
    }

  implicit val marketDescriptionListReader: XmlNodeReader[List[MarketDescription]] =
    node => node.convertDescendantsTo[MarketDescription](Elements.Market)
}
