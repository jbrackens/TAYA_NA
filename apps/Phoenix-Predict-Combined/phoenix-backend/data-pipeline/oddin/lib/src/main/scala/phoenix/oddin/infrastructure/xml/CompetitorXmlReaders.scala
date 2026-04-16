package phoenix.oddin.infrastructure.xml

import cats.syntax.apply._

import phoenix.core.XmlUtils.DefaultXmlAttributeReaders.stringAttributeReader
import phoenix.core.XmlUtils._
import phoenix.oddin.domain.Competitor
import phoenix.oddin.domain.CompetitorAbbreviation
import phoenix.oddin.domain.CompetitorName
import phoenix.oddin.domain.CompetitorSide
import phoenix.oddin.domain.OddinCompetitorId
import phoenix.oddin.infrastructure.xml.XmlReaderSupport.xmlErrorOr

object CompetitorXmlReaders {

  implicit val competitorIdNamedReader: XmlNamedAttributeReader[OddinCompetitorId] =
    (node, name) =>
      node.readAttributeForName[String](name).andThen(strValue => xmlErrorOr(OddinCompetitorId.fromString, strValue))

  implicit val competitorIdReader: XmlAttributeReader[OddinCompetitorId] =
    node => competitorIdNamedReader.readAttribute(node, Attributes.Id)

  implicit val competitorNameReader: XmlAttributeReader[CompetitorName] =
    node => node.readAttributeForName[String](Attributes.Name).map(CompetitorName)

  implicit val competitorAbbreviationReader: XmlAttributeReader[CompetitorAbbreviation] =
    node => node.readAttributeForName[String](Attributes.Abbreviation).map(CompetitorAbbreviation)

  implicit val competitorReader: XmlNodeReader[Competitor] =
    node => {
      val idResult = node.readAttribute[OddinCompetitorId]
      val nameResult = node.readAttribute[CompetitorName]
      val abbreviateResult = node.readAttribute[CompetitorAbbreviation]
      val qualifierResult = node.readAttributeForNameAsEnum[CompetitorSide](Attributes.Qualifier)

      (idResult, nameResult, abbreviateResult, qualifierResult).mapN(Competitor.apply _)
    }

  implicit val competitorListReader: XmlNodeReader[List[Competitor]] =
    node => node.convertDescendantsTo[Competitor](Elements.Competitor)
}
