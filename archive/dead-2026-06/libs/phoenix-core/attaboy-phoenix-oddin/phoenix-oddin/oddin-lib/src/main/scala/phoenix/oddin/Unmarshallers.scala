package phoenix.oddin

import akka.http.scaladsl.marshallers.xml.ScalaXmlSupport
import akka.http.scaladsl.model.HttpEntity
import akka.http.scaladsl.unmarshalling.Unmarshaller
import phoenix.oddin.data._

object Unmarshallers extends ScalaXmlSupport {
  import OddinXmlParsing._

  implicit val tournamentScheduleUnmarshaller: Unmarshaller[HttpEntity, TournamentSchedule] =
    defaultNodeSeqUnmarshaller.map(parseTournamentSchedule)

  implicit val sportUnmarshaller: Unmarshaller[HttpEntity, Seq[Sport]] =
    defaultNodeSeqUnmarshaller.map(parseSports)

  implicit val fixturesUnmarshaller: Unmarshaller[HttpEntity, Seq[Fixture]] =
    defaultNodeSeqUnmarshaller.map(parseFixtures)

  implicit val fixtureUnmarshaller: Unmarshaller[HttpEntity, Fixture] =
    fixturesUnmarshaller.map(_.head)

  implicit val marketUnmarshaller: Unmarshaller[HttpEntity, Seq[Market]] =
    defaultNodeSeqUnmarshaller.map(parseMarkets)

  implicit val sportEventUnmarshaller: Unmarshaller[HttpEntity, Seq[SportEvent]] =
    defaultNodeSeqUnmarshaller.map(parseSportEvents)

  implicit val matchStatusDescriptionUnmarshaller: Unmarshaller[HttpEntity, Seq[MatchStatus]] =
    defaultNodeSeqUnmarshaller.map(parseMatchStatuses)

  implicit val producersUnmarshaller: Unmarshaller[HttpEntity, Producers] =
    defaultNodeSeqUnmarshaller.map(parseProducers)

  implicit val marketDescriptionsUnmarshaller: Unmarshaller[HttpEntity, MarketDescriptions] =
    defaultNodeSeqUnmarshaller.map(parseMarketDescriptions)
}
