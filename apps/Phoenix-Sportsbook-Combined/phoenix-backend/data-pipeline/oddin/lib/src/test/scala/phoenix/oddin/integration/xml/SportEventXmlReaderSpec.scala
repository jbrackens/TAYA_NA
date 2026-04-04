package phoenix.oddin.integration.xml

import cats.data.Validated.Valid
import org.scalatest.matchers.should.Matchers
import org.scalatest.wordspec.AnyWordSpecLike

import phoenix.core.TimeUtils._
import phoenix.core.XmlUtils._
import phoenix.oddin.domain.CompetitorSide.Away
import phoenix.oddin.domain.CompetitorSide.Home
import phoenix.oddin.domain.SportEventState
import phoenix.oddin.domain._
import phoenix.oddin.infrastructure.xml.SportEventXmlReaders._
import phoenix.oddin.infrastructure.xml.UnsafeOddinValueObjectExtensions._
import phoenix.support.FileSupport

class SportEventXmlReaderSpec extends AnyWordSpecLike with Matchers with FileSupport {

  "read a pre-match sport event" in {
    val preMatchSportEvent =
      stringFromResource(baseDir = "data/domain", fileName = "pre-match-sport-event.xml").parseXml
        .convertTo[PreMatchSportEvent]

    preMatchSportEvent shouldBe expectedPreMatchSportEvent
  }

  "read a live sport event" in {
    val liveSportEvent = stringFromResource(baseDir = "data/domain", fileName = "live-sport-event.xml").parseXml
      .convertTo[PreMatchSportEvent]

    liveSportEvent shouldBe expectedLiveSportEvent
  }

  "read a match summary" in {
    val matchSummary =
      stringFromResource(baseDir = "data/domain", fileName = "match-summary.xml").parseXml.convertTo[MatchSummary]

    matchSummary shouldBe expectedMatchSummary
  }

  private val expectedPreMatchSportEvent = Valid(
    PreMatchSportEvent(
      OddinSportEventId.fromStringUnsafe(value = "od:match:28861"),
      SportEventName("AGO ROGUE vs G2 Arctic"),
      SportEventStartTime("2021-04-20T19:30Z".toUtcOffsetDateTime),
      Sport(
        OddinSportId.fromStringUnsafe(value = "od:sport:1"),
        SportName("League of Legends"),
        SportAbbreviation("LoL")),
      Tournament(
        OddinTournamentId.fromStringUnsafe(value = "od:tournament:1268"),
        TournamentName("European Masters 2021 Spring Main Event"),
        TournamentStartTime("2021-04-13T22:00Z".toUtcOffsetDateTime)),
      List(
        Competitor(
          OddinCompetitorId.fromStringUnsafe(value = "od:competitor:1281"),
          CompetitorName("AGO ROGUE"),
          CompetitorAbbreviation("RGO"),
          Home),
        Competitor(
          OddinCompetitorId.fromStringUnsafe(value = "od:competitor:761"),
          CompetitorName("G2 Arctic"),
          CompetitorAbbreviation("G2AR"),
          Away))))

  private val expectedLiveSportEvent = Valid(
    PreMatchSportEvent(
      OddinSportEventId.fromStringUnsafe(value = "od:match:29424"),
      SportEventName("Phoenix Gaming vs Aster.Aries"),
      SportEventStartTime("2021-04-19T07:00Z".toUtcOffsetDateTime),
      Sport(OddinSportId.fromStringUnsafe(value = "od:sport:2"), SportName("Dota 2"), SportAbbreviation("Dota2")),
      Tournament(
        OddinTournamentId.fromStringUnsafe(value = "od:tournament:1285"),
        TournamentName("Dota Pro Circuit 2021: Season 2 - China Lower Division"),
        TournamentStartTime("2021-04-11T22:00Z".toUtcOffsetDateTime)),
      List(
        Competitor(
          OddinCompetitorId.fromStringUnsafe(value = "od:competitor:2129"),
          CompetitorName("Phoenix Gaming"),
          CompetitorAbbreviation("Phoenix Gaming"),
          Home),
        Competitor(
          OddinCompetitorId.fromStringUnsafe(value = "od:competitor:651"),
          CompetitorName("Aster.Aries"),
          CompetitorAbbreviation("Aster.Aries"),
          Away))))

  private val expectedMatchSummary = Valid(
    MatchSummary(
      MatchSummarySportEvent(
        OddinSportEventId.fromStringUnsafe(value = "od:match:19816"),
        SportEventName("Team Aspirations vs Future.club"),
        SportEventStartTime("2020-11-09T09:50Z".toUtcOffsetDateTime),
        SportEventState.Closed,
        LiveOdds.NotAvailable,
        Sport(OddinSportId.fromStringUnsafe(value = "od:sport:2"), SportName("Dota 2"), SportAbbreviation("Dota2")),
        Tournament(
          OddinTournamentId.fromStringUnsafe(value = "od:tournament:862"),
          TournamentName("Asian DOTA2 Gold Occupation Competition S19"),
          TournamentStartTime("2020-10-28T23:00Z".toUtcOffsetDateTime)),
        List(
          Competitor(
            OddinCompetitorId.fromStringUnsafe(value = "od:competitor:699"),
            CompetitorName("Team Aspirations"),
            CompetitorAbbreviation("TA"),
            Home),
          Competitor(
            OddinCompetitorId.fromStringUnsafe(value = "od:competitor:704"),
            CompetitorName("Future.club"),
            CompetitorAbbreviation("FC"),
            Away))),
      SportEventStatus(
        Some(WinnerId(OddinCompetitorId.fromStringUnsafe(value = "od:competitor:704"))),
        HomeScore(4),
        AwayScore(5),
        SportEventState.Closed,
        SportEventProgress.Closed)))
}
