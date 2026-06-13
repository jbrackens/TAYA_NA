package phoenix.oddin.integration.http

import akka.actor.typed.ActorSystem
import akka.actor.typed.scaladsl.Behaviors
import akka.http.scaladsl.model.StatusCodes
import cats.data.NonEmptyList
import org.scalatest.matchers.should.Matchers
import org.scalatest.wordspec.AnyWordSpecLike

import phoenix.core.TimeUtils._
import phoenix.core.XmlUtils.NoDescendants
import phoenix.oddin.domain.CompetitorSide.Away
import phoenix.oddin.domain.CompetitorSide.Home
import phoenix.oddin.domain.LiveOdds.NotAvailable
import phoenix.oddin.domain.OddinRestApi.GetMatchSummaryError
import phoenix.oddin.domain.OddinRestApi.ListLiveSportEventsError
import phoenix.oddin.domain.OddinRestApi.ListMarketDescriptionsError
import phoenix.oddin.domain.OddinRestApi.ListSportEventsWithPreMatchOddsError
import phoenix.oddin.domain.OddinRestApi.ListSportsError
import phoenix.oddin.domain.OddinRestApi.UnexpectedHttpResponse
import phoenix.oddin.domain.OddinRestApi.UnmarshallingFailed
import phoenix.oddin.domain.OddinRestApi.XmlConversionFailed
import phoenix.oddin.domain.SportEventProgress
import phoenix.oddin.domain.SportEventState.Closed
import phoenix.oddin.domain._
import phoenix.oddin.domain.marketDescription.MarketDescription
import phoenix.oddin.domain.marketDescription.MarketDescriptionName
import phoenix.oddin.domain.marketDescription.MarketVariant
import phoenix.oddin.domain.marketDescription.Outcome
import phoenix.oddin.infrastructure.OddinConfig
import phoenix.oddin.infrastructure.http.AkkaHttpOddinRestApi
import phoenix.oddin.infrastructure.xml.UnsafeOddinValueObjectExtensions._
import phoenix.oddin.support.OddinFakeDataGenerator
import phoenix.oddin.support.OddinRestApiSupport._
import phoenix.oddin.support.TestResponse
import phoenix.support.FileSupport
import phoenix.support.FutureSupport

class AkkaHttpOddinRestApiSpec extends AnyWordSpecLike with Matchers with FutureSupport with FileSupport {

  implicit val system = ActorSystem(Behaviors.ignore, classOf[AkkaHttpOddinRestApiSpec].getSimpleName)
  val apiConfig = OddinConfig.of(system).apiConfig

  s"${classOf[AkkaHttpOddinRestApi].getSimpleName}" when {

    "listing available sports" should {

      "return a list of all available sports" in {
        val oddin =
          createClient(
            apiConfig,
            TestResponse("/v1/sports/en/sports", readResponse(fileName = "list-all-sports-response.xml")))

        val allSports = awaitRight(oddin.listAllSports())

        allSports shouldBe listAllSportsResult
      }

      "return failure with correct status code when receiving failed response" in {
        val oddin = createFailingClient(apiConfig, StatusCodes.Unauthorized)
        val allSports = awaitLeft(oddin.listAllSports())

        allSports shouldBe ListSportsError(UnexpectedHttpResponse(401, ""))
      }

      "return correct failure when receiving empty response" in {
        val oddin = createFailingClient(apiConfig, StatusCodes.OK)
        val allSports = awaitLeft(oddin.listAllSports())

        allSports shouldBe ListSportsError(XmlConversionFailed(NonEmptyList.one(NoDescendants)))
      }

      "fail correctly on incorrect response" in {
        val incorrectResponse =
          """
            <fightClub rule1="you do not talk about Fight Club/>
          """
        val oddin = createClient(apiConfig, TestResponse("/v1/sports/en/sports", incorrectResponse))
        val allSports = awaitLeft(oddin.listAllSports())

        allSports.cause shouldBe a[UnmarshallingFailed]
      }
    }

    "listing all currently live sport events" should {

      "return a list of all currently live sport events" in {
        val oddin = createClient(
          apiConfig,
          TestResponse(
            "/v1/sports/en/schedules/live/schedule",
            readResponse(fileName = "list-all-current-live-sport-events-response.xml")))

        val allCurrentLiveSportEvents = awaitRight(oddin.listAllCurrentLiveSportEvents())

        allCurrentLiveSportEvents shouldBe listAllLiveSportEventsResult
      }

      "return failure with correct status code when receiving failed response" in {
        val oddin = createFailingClient(apiConfig, StatusCodes.BadRequest)
        val allSports = awaitLeft(oddin.listAllCurrentLiveSportEvents())

        allSports shouldBe ListLiveSportEventsError(UnexpectedHttpResponse(400, ""))
      }

      "return correct failure when receiving empty response" in {
        val oddin = createFailingClient(apiConfig, StatusCodes.OK)
        val allSports = awaitLeft(oddin.listAllCurrentLiveSportEvents())

        allSports shouldBe ListLiveSportEventsError(XmlConversionFailed(NonEmptyList.one(NoDescendants)))
      }

      "fail correctly on malformed response" in {
        val malformedResponse =
          """
            <fightClub>
              <humanSacrifices>
                <humanSacrifice name="Raymond K. Essel"/>
              </humanSacrifices>
            </fightClub
          """
        val oddin = createClient(apiConfig, TestResponse("/v1/sports/en/schedules/live/schedule", malformedResponse))
        val allSports = awaitLeft(oddin.listAllCurrentLiveSportEvents())

        allSports.cause shouldBe a[UnmarshallingFailed]
      }
    }

    "listing all fixtures with pre-match odds" should {

      "return a list of all fixtures with pre-match odds" in {
        val oddin =
          createClient(
            apiConfig,
            TestResponse(
              "/v1/sports/en/schedules/pre/schedule?start=0&limit=1000",
              readResponse(fileName = "list-all-sport-events-with-pre-match-odds-response.xml")))

        val allSportEventsWithPreMatchOdds = awaitRight(oddin.listAllSportEventsWithPreMatchOdds())

        allSportEventsWithPreMatchOdds shouldBe listAllSportEventsWithPreMatchOddsResult
      }

      "return failure with correct status code when receiving failed response" in {
        val oddin = createFailingClient(apiConfig, StatusCodes.TooManyRequests)
        val allSportEvents = awaitLeft(oddin.listAllSportEventsWithPreMatchOdds())

        allSportEvents shouldBe ListSportEventsWithPreMatchOddsError(UnexpectedHttpResponse(429, ""))
      }

      "return correct failure when receiving empty response" in {
        val oddin = createFailingClient(apiConfig, StatusCodes.OK)
        val allSportEvents = awaitLeft(oddin.listAllSportEventsWithPreMatchOdds())

        allSportEvents shouldBe ListSportEventsWithPreMatchOddsError(
          XmlConversionFailed(NonEmptyList.one(NoDescendants)))
      }

      "fail correctly on malformed response" in {
        val malformedResponse =
          """
            <fightClub>
              <supportGroups>
                <supportGroup name="Brain Parasites" owner="Marla">
              </supportGroups>
            </fightClub
          """
        val oddin =
          createClient(
            apiConfig,
            TestResponse("/v1/sports/en/schedules/pre/schedule?start=0&limit=1000", malformedResponse))
        val allSportEvents = awaitLeft(oddin.listAllSportEventsWithPreMatchOdds())

        allSportEvents.cause shouldBe a[UnmarshallingFailed]
      }
    }

    "returning a match summary" should {

      "return a match summary" in {
        val oddinSportEventId = OddinFakeDataGenerator.generateSportEventId()
        val oddin =
          createClient(
            apiConfig,
            TestResponse(
              s"/v1/sports/en/sport_events/${oddinSportEventId.value}/summary",
              readResponse(fileName = "get-match-summary-response.xml")))

        val matchSummary = awaitRight(oddin.getMatchSummary(oddinSportEventId))

        matchSummary shouldBe expectedMatchSummaryResult
      }

      "return failure with correct status code when receiving failed response" in {
        val oddinSportEventId = OddinFakeDataGenerator.generateSportEventId()
        val oddin = createFailingClient(apiConfig, StatusCodes.BadRequest)
        val allSports = awaitLeft(oddin.getMatchSummary(oddinSportEventId))

        allSports shouldBe GetMatchSummaryError(UnexpectedHttpResponse(400, ""))
      }

      "return correct failure when receiving empty response" in {
        val oddinSportEventId = OddinFakeDataGenerator.generateSportEventId()
        val oddin = createFailingClient(apiConfig, StatusCodes.OK)
        val allSports = awaitLeft(oddin.getMatchSummary(oddinSportEventId))

        allSports shouldBe GetMatchSummaryError(XmlConversionFailed(NonEmptyList.one(NoDescendants)))
      }

      "fail correctly on malformed response" in {
        val oddinSportEventId = OddinFakeDataGenerator.generateSportEventId()
        val malformedResponse =
          """
            <fightClub>
              <supportGroups>
                <supportGroup name="Brain Parasites" owner="Marla">
              </supportGroups>
            </fightClub
          """
        val oddin =
          createClient(
            apiConfig,
            TestResponse(s"/v1/sports/en/sport_events/${oddinSportEventId.value}/summary", malformedResponse))
        val allSports = awaitLeft(oddin.getMatchSummary(oddinSportEventId))

        allSports.cause shouldBe a[UnmarshallingFailed]
      }
    }

    "listing market descriptions" should {

      "return a list of all market descriptions" in {
        val oddin =
          createClient(
            apiConfig,
            TestResponse(
              "/v1/descriptions/en/markets",
              readResponse(fileName = "list-all-market-descriptions-response.xml")))

        val allMarketDescriptions = awaitRight(oddin.listAllMarketDescriptions())

        allMarketDescriptions shouldBe expectedMarketDescriptionsResult
      }

      "return failure with correct status code when receiving failed response" in {
        val oddin = createFailingClient(apiConfig, StatusCodes.BadRequest)
        val allSports = awaitLeft(oddin.listAllMarketDescriptions())

        allSports shouldBe ListMarketDescriptionsError(UnexpectedHttpResponse(400, ""))
      }

      "return correct failure when receiving empty response" in {
        val oddin = createFailingClient(apiConfig, StatusCodes.OK)
        val allSports = awaitLeft(oddin.listAllMarketDescriptions())

        allSports shouldBe ListMarketDescriptionsError(XmlConversionFailed(NonEmptyList.one(NoDescendants)))
      }

      "fail correctly on malformed response" in {
        val malformedResponse =
          """
            <fightClub>
              <members>
                <member hisNameIs="Robert Paulson" />
              </members
            </fightClub
          """
        val oddin =
          createClient(apiConfig, TestResponse("/v1/descriptions/en/markets", malformedResponse))
        val allSports = awaitLeft(oddin.listAllMarketDescriptions())

        allSports.cause shouldBe a[UnmarshallingFailed]
      }
    }
  }

  private def readResponse(fileName: String): String =
    stringFromResource(baseDir = "data/http", fileName)

  val listAllSportsResult = List(
    Sport(
      OddinSportId.fromStringUnsafe(value = "od:sport:1"),
      SportName("League of Legends"),
      SportAbbreviation("LoL")),
    Sport(OddinSportId.fromStringUnsafe(value = "od:sport:2"), SportName("Dota 2"), SportAbbreviation("Dota2")),
    Sport(
      OddinSportId.fromStringUnsafe(value = "od:sport:3"),
      SportName("Counter-Strike: Global Offensive"),
      SportAbbreviation("CS:GO")),
    Sport(OddinSportId.fromStringUnsafe(value = "od:sport:4"), SportName("Fortnite"), SportAbbreviation("Fortnite")),
    Sport(
      OddinSportId.fromStringUnsafe(value = "od:sport:5"),
      SportName("Playerunknown’s Battlegrounds"),
      SportAbbreviation("PUBG")),
    Sport(OddinSportId.fromStringUnsafe(value = "od:sport:6"), SportName("FIFA"), SportAbbreviation("FIFA")),
    Sport(OddinSportId.fromStringUnsafe(value = "od:sport:7"), SportName("NBA2K"), SportAbbreviation("NBA2K")),
    Sport(OddinSportId.fromStringUnsafe(value = "od:sport:8"), SportName("Overwatch"), SportAbbreviation("Overwatch")),
    Sport(
      OddinSportId.fromStringUnsafe(value = "od:sport:9"),
      SportName("Hearthstone"),
      SportAbbreviation("Hearthstone")),
    Sport(OddinSportId.fromStringUnsafe(value = "od:sport:10"), SportName("Kings of Glory"), SportAbbreviation("KoG")),
    Sport(OddinSportId.fromStringUnsafe(value = "od:sport:11"), SportName("Starcraft 2"), SportAbbreviation("SC2")),
    Sport(
      OddinSportId.fromStringUnsafe(value = "od:sport:12"),
      SportName("Rocket League"),
      SportAbbreviation("RocketLeague")),
    Sport(OddinSportId.fromStringUnsafe(value = "od:sport:13"), SportName("Valorant"), SportAbbreviation("Valorant")),
    Sport(OddinSportId.fromStringUnsafe(value = "od:sport:14"), SportName("Starcraft 1"), SportAbbreviation("SC1")),
    Sport(OddinSportId.fromStringUnsafe(value = "od:sport:15"), SportName("Call of Duty"), SportAbbreviation("CoD")),
    Sport(OddinSportId.fromStringUnsafe(value = "od:sport:16"), SportName("Rainbow Six"), SportAbbreviation("R6")),
    Sport(OddinSportId.fromStringUnsafe(value = "od:sport:17"), SportName("NHL"), SportAbbreviation("NHL")))

  val listAllSportEventsWithPreMatchOddsResult = List(
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

  val listAllLiveSportEventsResult = List(
    LiveSportEvent(
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

  val expectedMatchSummaryResult = MatchSummary(
    MatchSummarySportEvent(
      OddinSportEventId.fromStringUnsafe(value = "od:match:19816"),
      SportEventName("Team Aspirations vs Future.club"),
      SportEventStartTime("2020-11-09T09:50Z".toUtcOffsetDateTime),
      Closed,
      NotAvailable,
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
      Closed,
      SportEventProgress.Closed))

  val expectedMarketDescriptionsResult = List(
    MarketDescription(
      MarketDescriptionId(1),
      MarketDescriptionName("Match winner - {way}way"),
      Some(MarketVariant("way:two")),
      List(Outcome(OutcomeId(1), OutcomeName("home")), Outcome(OutcomeId(2), OutcomeName("away")))),
    MarketDescription(
      MarketDescriptionId(1),
      MarketDescriptionName("Match winner - {way}way"),
      Some(MarketVariant("way:three")),
      List(
        Outcome(OutcomeId(1), OutcomeName("home")),
        Outcome(OutcomeId(2), OutcomeName("away")),
        Outcome(OutcomeId(3), OutcomeName("draw")))),
    MarketDescription(
      MarketDescriptionId(22),
      MarketDescriptionName("Second half winner - {way}way"),
      Some(MarketVariant("way:three")),
      List(
        Outcome(OutcomeId(1), OutcomeName("home")),
        Outcome(OutcomeId(2), OutcomeName("away")),
        Outcome(OutcomeId(3), OutcomeName("draw")))))
}
