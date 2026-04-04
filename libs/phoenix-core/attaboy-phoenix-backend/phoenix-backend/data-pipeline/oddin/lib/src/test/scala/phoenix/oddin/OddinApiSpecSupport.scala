package phoenix.oddin

import java.util.UUID

import scala.io.Source

import akka.actor.typed.scaladsl.adapter._
import akka.actor.typed.{ActorSystem => TypedActorSystem}
import com.github.tomakehurst.wiremock.client.CountMatchingStrategy
import com.github.tomakehurst.wiremock.client.WireMock._
import com.github.tomakehurst.wiremock.matching.EqualToPattern
import com.github.tomakehurst.wiremock.stubbing.Scenario
import org.scalamock.scalatest.MockFactory

import phoenix.http.core.AkkaHttpClient
import phoenix.oddin.domain.OddinRestApi
import phoenix.oddin.infrastructure.OddinApiConfig
import phoenix.oddin.infrastructure.OddinEnvironment
import phoenix.oddin.infrastructure.http.AkkaHttpOddinRestApi

case class EndpointStub(
    endpoint: String,
    responseString: Seq[String],
    expectedTimes: CountMatchingStrategy = moreThanOrExactly(0))

trait OddinApiSpecSupport extends MockFactory {
  import OddinApiSpecSupport._

  def defaultRequests() =
    Seq(
      EndpointStub("/v1/sports/en/sports", listAllSportsResponse),
      EndpointStub("/v1/descriptions/en/markets", listAllMarketDescriptionsResponse),
      EndpointStub("/v1/descriptions/en/match_status", listAllMatchStatusDescriptionsResponse),
      EndpointStub("/v1/descriptions/producers", listAllProducersResponse),
      EndpointStub("/v1/sports/en/fixtures/changes", listAllFixturesWithChangesInPreviousDayResponse),
      EndpointStub("/v1/sports/en/sport_events/od:match:15061/fixture", listAllFixtureDetailsForSportEventResponse),
      EndpointStub("/v1/sports/en/schedules/2020-09-10/schedule", listAllSportEventsForDateResponse),
      EndpointStub("/v1/sports/en/schedules/live/schedule", listAllCurrentLiveSportEventsResponse),
      EndpointStub(
        "/v1/sports/en/schedules/pre/schedule?start=0&limit=1000",
        listAllSportEventsWithPreMatchOddsResponse),
      EndpointStub("/v1/sports/en/tournaments/od:tournament:654/schedule", listAllSportEventsForTournamentResponse),
      EndpointStub("/v1/sports/en/sport_events/od:match:19816/summary", getMatchSummaryResponse))

  def phoenixSpecOddinConfig(baseUrl: String = "http://localhost"): phoenix.oddin.infrastructure.OddinApiConfig = {
    val environment = OddinEnvironment.Integration
    val url = baseUrl
    val accessToken = "abc123"
    val nodeId = 1

    phoenix.oddin.infrastructure.OddinApiConfig(environment, url, accessToken, nodeId)
  }

  def withOddinApi(
      requests: Seq[EndpointStub] = defaultRequests(),
      oddinConfig: phoenix.oddin.infrastructure.OddinApiConfig = phoenixSpecOddinConfig())(f: OddinRestApi => Any)(
      implicit system: TypedActorSystem[_]) = {

    val client = new AkkaHttpOddinRestApi(
      new AkkaHttpClient(system.toClassic),
      phoenix.oddin.infrastructure
        .OddinApiConfig(oddinConfig.environment, oddinConfig.url, oddinConfig.accessToken, oddinConfig.nodeId))

    instrumentStub(requests, oddinConfig.accessToken)

    f(client)

    verifyStub(requests)
  }

  def specOddinConfig(baseUrl: String = "http://localhost"): OddinApiConfig = {
    val environment = OddinEnvironment.Integration
    val url = baseUrl
    val accessToken = "abc123"
    val nodeId = 1

    OddinApiConfig(environment, url, accessToken, nodeId)
  }

  def verifyStub(requests: Seq[EndpointStub]) =
    requests.foreach { request =>
      verify(request.expectedTimes, getRequestedFor(urlEqualTo(request.endpoint)))
    }

  def instrumentStub(requests: Seq[EndpointStub], oddinAccessToken: String) =
    requests.foreach { request =>
      val scenario = UUID.randomUUID().toString
      val EndpointStub(endpoint, responses, _) = request

      responses.zipWithIndex.foreach {
        case (response, index) =>
          stubFor(
            get(endpoint)
              .withHeader("X-Access-Token", new EqualToPattern(oddinAccessToken))
              .inScenario(scenario)
              .whenScenarioStateIs(if (index == 0) Scenario.STARTED else index.toString)
              .willReturn(ok().withHeader("Content-Type", "application/xml;charset=utf-8").withBody(response))
              .willSetStateTo((index + 1).toString))
      }
    }
}

object OddinApiSpecSupport {
  val ResponsesDir = "/data"

  private def getStringFromFile(fileName: String): String =
    Source.fromURL(getClass.getResource(s"$ResponsesDir/$fileName")).mkString

  lazy val listAllSportsResponse = Seq(getStringFromFile("list-all-sports-response.xml"))
  lazy val listAllMarketDescriptionsResponse = Seq(getStringFromFile("list-all-market-descriptions-response.xml"))
  lazy val listAllMatchStatusDescriptionsResponse = Seq(
    getStringFromFile("list-all-match-status-descriptions-response.xml"))
  lazy val listAllProducersResponse = Seq(getStringFromFile("list-all-producers-response.xml"))
  lazy val listAllSportEventsWithPreMatchOddsResponse = Seq(
    getStringFromFile("list-all-sport-events-with-pre-match-odds-response.xml"))
  lazy val listAllCurrentLiveSportEventsResponse = Seq(
    getStringFromFile("list-all-current-live-sport-events-response.xml"))
  lazy val listAllFixtureDetailsForSportEventResponse = Seq(
    getStringFromFile("list-all-fixture-details-for-sport-event-response.xml"))
  lazy val listAllFixturesWithChangesInPreviousDayResponse = Seq(
    getStringFromFile("list-all-fixtures-with-changes-in-previous-day-response.xml"))
  lazy val listAllSportEventsForTournamentResponse = Seq(
    getStringFromFile("list-all-sport-events-for-tournament-response.xml"))
  lazy val listAllSportEventsForDateResponse = Seq(getStringFromFile("list-all-sports-events-for-date-response.xml"))
  lazy val getMatchSummaryResponse = Seq(getStringFromFile("get-match-summary-response.xml"))
}
