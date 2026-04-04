package phoenix.oddin.infrastructure.xml

import cats.syntax.apply._

import phoenix.core.XmlUtils.DefaultXmlAttributeReaders.stringAttributeReader
import phoenix.core.XmlUtils._
import phoenix.oddin.domain.OddinSportId
import phoenix.oddin.domain.Sport
import phoenix.oddin.domain.SportAbbreviation
import phoenix.oddin.domain.SportName
import phoenix.oddin.infrastructure.xml.XmlReaderSupport.xmlErrorOr

object SportXmlReaders {

  implicit val oddinSportIdReader: XmlAttributeReader[OddinSportId] =
    node =>
      node
        .readAttributeForName[String](Attributes.Id)
        .andThen(strValue => xmlErrorOr(OddinSportId.fromString, strValue))

  implicit val oddinSportNameReader: XmlAttributeReader[SportName] =
    node => node.readAttributeForName[String](Attributes.Name).map(SportName)

  implicit val sportAbbreviationReader: XmlAttributeReader[SportAbbreviation] =
    node => node.readAttributeForName[String](Attributes.Abbreviation).map(SportAbbreviation)

  implicit val sportReader: XmlNodeReader[Sport] =
    node => {
      val idResult = node.readAttribute[OddinSportId]
      val nameResult = node.readAttribute[SportName]
      val abbreviationResult = node.readAttribute[SportAbbreviation]

      (idResult, nameResult, abbreviationResult).mapN(Sport.apply _)
    }

  implicit val sportListReader: XmlNodeReader[List[Sport]] =
    node => node.convertDescendantsTo[Sport](Elements.Sport)
}
