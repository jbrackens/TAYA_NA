package phoenix.oddin.infrastructure.xml

import java.time.OffsetDateTime

import cats.syntax.apply._

import phoenix.core.TimeUtils._
import phoenix.core.XmlUtils.DefaultXmlAttributeReaders.stringAttributeReader
import phoenix.core.XmlUtils._
import phoenix.oddin.domain.OddinTournamentId
import phoenix.oddin.domain.Tournament
import phoenix.oddin.domain.TournamentName
import phoenix.oddin.domain.TournamentStartTime
import phoenix.oddin.infrastructure.xml.XmlReaderSupport.xmlErrorOr

object TournamentXmlReaders {

  implicit val tournamentIdReader: XmlAttributeReader[OddinTournamentId] =
    node =>
      node
        .readAttributeForName[String](Attributes.Id)
        .andThen(strValue => xmlErrorOr(OddinTournamentId.fromString, strValue))

  implicit val tournamentNameReader: XmlAttributeReader[TournamentName] =
    node => node.readAttributeForName[String](Attributes.Name).map(TournamentName)

  implicit val tournamentStartTimeReader: XmlAttributeReader[TournamentStartTime] =
    node =>
      node
        .readAttribute[String, OffsetDateTime](Attributes.Scheduled, _.toUtcOffsetDateTimeFromLocalDateTimeFormat)
        .map(TournamentStartTime)

  implicit val tournamentReader: XmlNodeReader[Tournament] =
    node => {
      val idResult = node.readAttribute[OddinTournamentId]
      val nameResult = node.readAttribute[TournamentName]
      val startTimeResult = node.readAttribute[TournamentStartTime]

      (idResult, nameResult, startTimeResult).mapN(Tournament.apply _)
    }
}
