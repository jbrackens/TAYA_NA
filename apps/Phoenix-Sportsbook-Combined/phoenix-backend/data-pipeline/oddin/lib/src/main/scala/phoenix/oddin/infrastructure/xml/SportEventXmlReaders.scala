package phoenix.oddin.infrastructure.xml

import java.time.OffsetDateTime

import cats.syntax.apply._
import cats.syntax.validated._

import phoenix.core.TimeUtils._
import phoenix.core.XmlUtils.DefaultXmlAttributeReaders.intAttributeReader
import phoenix.core.XmlUtils.DefaultXmlAttributeReaders.optionalAttributeReader
import phoenix.core.XmlUtils.DefaultXmlAttributeReaders.stringAttributeReader
import phoenix.core.XmlUtils._
import phoenix.oddin.domain.LiveOdds.NotAvailable
import phoenix.oddin.domain._
import phoenix.oddin.infrastructure.xml.CompetitorXmlReaders._
import phoenix.oddin.infrastructure.xml.SportXmlReaders._
import phoenix.oddin.infrastructure.xml.TournamentXmlReaders._
import phoenix.oddin.infrastructure.xml.XmlReaderSupport.xmlErrorOr

object SportEventXmlReaders {

  implicit val sportEventIdReader: XmlAttributeReader[OddinSportEventId] =
    node =>
      node
        .readAttributeForName[String](Attributes.Id)
        .andThen(strValue => xmlErrorOr(OddinSportEventId.fromString, strValue))

  implicit val sportEventNameReader: XmlAttributeReader[SportEventName] =
    node => node.readAttributeForName[String](Attributes.Name).map(SportEventName)

  implicit val sportEventStartTimeReader: XmlAttributeReader[SportEventStartTime] =
    node =>
      node
        .readAttribute[String, OffsetDateTime](Attributes.Scheduled, _.toUtcOffsetDateTimeFromLocalDateTimeFormat)
        .map(SportEventStartTime)

  implicit val sportEventProgressReader: XmlAttributeReader[SportEventProgress] =
    node =>
      node
        .readAttributeForName[Int](Attributes.MatchStatusCode)
        .andThen(intValue => xmlErrorOr(SportEventProgress.fromInt, intValue))

  implicit val winnerIdReader: XmlAttributeReader[WinnerId] =
    node => node.readAttributeForName[OddinCompetitorId](Attributes.WinnerId).map(WinnerId)

  implicit val homeScoreReader: XmlAttributeReader[HomeScore] =
    node => node.readAttributeForName[Int](Attributes.HomeScore).map(HomeScore)

  implicit val awayScoreReader: XmlAttributeReader[AwayScore] =
    node => node.readAttributeForName[Int](Attributes.AwayScore).map(AwayScore)

  implicit val matchSummarySportEventReader: XmlNodeReader[MatchSummarySportEvent] =
    node => {
      val idResult = node.readAttribute[OddinSportEventId]
      val nameResult = node.readAttribute[SportEventName]
      val startTimeResult = node.readAttribute[SportEventStartTime]
      val stateResult = node.readAttributeForNameAsEnum[SportEventState](Attributes.Status)
      val liveOddsResult = node.readAttributeForNameAsEnum[LiveOdds](Attributes.LiveOdds).orElse(NotAvailable.validNel)
      val sportResult = node.convertFirstDescendantTo[Sport](Elements.Sport)
      val tournamentResult = node.convertFirstDescendantTo[Tournament](Elements.Tournament)
      val competitorsResult = node.convertTo[List[Competitor]]

      (
        idResult,
        nameResult,
        startTimeResult,
        stateResult,
        liveOddsResult,
        sportResult,
        tournamentResult,
        competitorsResult).mapN(MatchSummarySportEvent)
    }

  implicit val liveSportEventReader: XmlNodeReader[LiveSportEvent] =
    node => {
      val idResult = node.readAttribute[OddinSportEventId]
      val nameResult = node.readAttribute[SportEventName]
      val startTimeResult = node.readAttribute[SportEventStartTime]
      val sportResult = node.convertFirstDescendantTo[Sport](Elements.Sport)
      val tournamentResult = node.convertFirstDescendantTo[Tournament](Elements.Tournament)
      val competitorsResult = node.convertTo[List[Competitor]]

      (idResult, nameResult, startTimeResult, sportResult, tournamentResult, competitorsResult).mapN(LiveSportEvent)
    }

  implicit val preMatchSportEventReader: XmlNodeReader[PreMatchSportEvent] =
    node => {
      val idResult = node.readAttribute[OddinSportEventId]
      val nameResult = node.readAttribute[SportEventName]
      val startTimeResult = node.readAttribute[SportEventStartTime]
      val sportResult = node.convertFirstDescendantTo[Sport](Elements.Sport)
      val tournamentResult = node.convertFirstDescendantTo[Tournament](Elements.Tournament)
      val competitorsResult = node.convertTo[List[Competitor]]

      (idResult, nameResult, startTimeResult, sportResult, tournamentResult, competitorsResult).mapN(PreMatchSportEvent)
    }

  implicit val sportEventStatusReader: XmlNodeReader[SportEventStatus] =
    node => {
      val winnerIdResult = node.readAttribute[Option[WinnerId]]
      val homeScoreResult = node.readAttribute[HomeScore]
      val awayScoreResult = node.readAttribute[AwayScore]
      val statusResult = node.readAttributeForNameAsEnum[SportEventState](Attributes.Status)
      val progressResult = node.readAttribute[SportEventProgress]

      (winnerIdResult, homeScoreResult, awayScoreResult, statusResult, progressResult).mapN(SportEventStatus)
    }

  implicit val matchSummaryReader: XmlNodeReader[MatchSummary] =
    node => {
      val sportEventResult = node.convertFirstDescendantTo[MatchSummarySportEvent](Elements.SportEvent)
      val sportEventStatusResult = node.convertFirstDescendantTo[SportEventStatus](Elements.SportEventStatus)

      (sportEventResult, sportEventStatusResult).mapN(MatchSummary)
    }

  implicit val matchSummarySportEventListReader: XmlNodeReader[List[MatchSummarySportEvent]] =
    node => node.convertDescendantsTo[MatchSummarySportEvent](Elements.SportEvent)

  implicit val liveSportEventListReader: XmlNodeReader[List[LiveSportEvent]] =
    node => node.convertDescendantsTo[LiveSportEvent](Elements.SportEvent)

  implicit val preMatchSportEventListReader: XmlNodeReader[List[PreMatchSportEvent]] =
    node => node.convertDescendantsTo[PreMatchSportEvent](Elements.SportEvent)
}
