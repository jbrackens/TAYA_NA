package phoenix.oddin.infrastructure.xml

import cats.data.NonEmptyList

import phoenix.core.XmlUtils.DefaultXmlAttributeReaders.intAttributeReader
import phoenix.core.XmlUtils.DefaultXmlAttributeReaders.stringAttributeReader
import phoenix.core.XmlUtils._
import phoenix.core.validation.Validation.Validation
import phoenix.oddin.domain.MarketDescriptionId
import phoenix.oddin.domain.OddinSportEventId
import phoenix.oddin.domain.OddinTournamentId
import phoenix.oddin.domain.OutcomeId
import phoenix.oddin.domain.OutcomeName

object XmlReaderSupport {

  def xmlErrorOr[A, T](validatingFn: A => Validation[T], arg: A): ValidationResult[T] =
    validatingFn(arg).leftMap(error => NonEmptyList.one[XmlError](InvalidAttributeValue(error)))

  implicit val sportEventIdReader: XmlAttributeReader[OddinSportEventId] =
    node =>
      node
        .readAttributeForName[String](Attributes.EventId)
        .andThen(strValue => xmlErrorOr(OddinSportEventId.fromString, strValue))

  implicit val tournamentIdReader: XmlAttributeReader[OddinTournamentId] =
    node =>
      node
        .readAttributeForName[String](Attributes.EventId)
        .andThen(strValue => xmlErrorOr(OddinTournamentId.fromString, strValue))

  implicit val outcomeIdReader: XmlAttributeReader[OutcomeId] =
    node => node.readAttributeForName[Int](Attributes.Id).map(OutcomeId)

  implicit val outcomeNameReader: XmlAttributeReader[OutcomeName] =
    node => node.readAttributeForName[String](Attributes.Name).map(OutcomeName)

  implicit val marketDescriptionIdReader: XmlAttributeReader[MarketDescriptionId] =
    node => node.readAttributeForName[Int](Attributes.Id).map(MarketDescriptionId)
}
