package phoenix.betgenius.infrastructure.http
import scala.concurrent.ExecutionContextExecutor
import scala.concurrent.duration._

import akka.actor.ActorSystem
import com.github.tomakehurst.wiremock.client.WireMock._
import org.scalatest.BeforeAndAfterAll
import org.scalatest.concurrent.IntegrationPatience
import org.scalatest.matchers.should.Matchers
import org.scalatest.wordspec.AnyWordSpec

import phoenix.betgenius.domain._
import phoenix.betgenius.infrastructure.BetgeniusApiConfig
import phoenix.http.core.AkkaHttpClient
import phoenix.support.FileSupport
import phoenix.support.FutureSupport
import phoenix.support.HttpSpec

class AkkaHttpBetgeniusRestApiSpec
    extends AnyWordSpec
    with Matchers
    with FutureSupport
    with BeforeAndAfterAll
    with IntegrationPatience
    with FileSupport
    with HttpSpec {

  implicit val as: ActorSystem = ActorSystem()
  implicit val ec: ExecutionContextExecutor = as.dispatcher

  "Betgenius API createClient" should {
    "return correct fixtures response" in {
      // given
      stubLoginResponse()
      stubFor(
        get(s"/Fixtures-v1/INT/sports/10915624/fixtures")
          .withHeader("x-api-key", equalTo("test_access_token"))
          .withHeader("Authorization", equalTo("Bearer test_id_token"))
          .willReturn(aResponse().withBody(stringFromResource("api", "fixtures.json"))))

      // when
      val fixtures = createClient().getESportFixtures().futureValue

      // then
      fixtures.size should ===(3)
      fixtures.head should ===(
        FixtureResponse(
          id = 8705439,
          sportId = 10915624,
          name = "[Test] League of Legends Competitor A v [Test] League of Legends Competitor B (1638144000)",
          sportName = "eSports",
          competitionId = 6793,
          competitionName = "[Test] League of Legends Competition",
          seasonId = 46589,
          seasonName = "2015/2020 [Test] League of Legends Competition",
          startDate = "2021-11-29 00:00:00",
          statusType = "scheduled",
          `type` = "Match",
          fixturecompetitors = Seq(
            FixtureCompetitor(CompetitorResponse(826645, "[Test] League of Legends Competitor A")),
            FixtureCompetitor(CompetitorResponse(826646, "[Test] League of Legends Competitor B")))))

    }

    "return correct competition response" in {
      // given
      stubLoginResponse()
      stubFor(
        get(s"/Fixtures-v1/INT/competitions/6793")
          .withHeader("x-api-key", equalTo("test_access_token"))
          .withHeader("Authorization", equalTo("Bearer test_id_token"))
          .willReturn(aResponse().withBody(stringFromResource("api", "competition.json"))))

      // when
      val response = createClient().getCompetition(6793).futureValue
      // then
      response should ===(
        CompetitionResponse(
          id = 6793,
          name = "[Test] League of Legends Competition",
          competitionproperty = CompetitionProperty(regionId = 3795068)))
    }

    "cache login response" in {
      // given
      stubLoginResponse()
      stubFor(
        get(s"/Fixtures-v1/INT/competitions/6793")
          .withHeader("x-api-key", equalTo("test_access_token"))
          .withHeader("Authorization", equalTo("Bearer test_id_token"))
          .willReturn(aResponse().withBody(stringFromResource("api", "competition.json"))))

      // when
      val client = createClient()
      client.getCompetition(6793).futureValue
      client.getCompetition(6793).futureValue

      // then
      verify(
        1,
        postRequestedFor(urlEqualTo("/Auth-v1/PROD/login"))
          .withRequestBody(equalToJson("""{ "user" : "test_username", "password" : "test_password" }""")))
    }

    "request new token when it has expired" in {
      // given
      stubLoginResponse()
      stubFor(
        get(s"/Fixtures-v1/INT/competitions/6793")
          .withHeader("x-api-key", equalTo("test_access_token"))
          .withHeader("Authorization", equalTo("Bearer test_id_token"))
          .willReturn(aResponse().withBody(stringFromResource("api", "competition.json"))))

      val client = createClient(loginTokenTtl = 100 milliseconds)
      client.getCompetition(6793).futureValue
      Thread.sleep(200)
      client.getCompetition(6793).futureValue

      // then
      verify(
        2,
        postRequestedFor(urlEqualTo("/Auth-v1/PROD/login"))
          .withRequestBody(equalToJson("""{ "user" : "test_username", "password" : "test_password" }""")))
    }
  }

  private def createClient(loginTokenTtl: FiniteDuration = 1 minute): BetgeniusRestApi = {
    val config = BetgeniusApiConfig(
      url = httpBaseUrl,
      username = "test_username",
      password = "test_password",
      accessToken = "test_access_token",
      environment = "INT",
      loginTokenTtl = loginTokenTtl)
    val httpClient = new AkkaHttpClient(as)

    new AkkaHttpBetgeniusRestApi(httpClient, config)
  }

  private def stubLoginResponse() = {
    stubFor(
      post(s"/Auth-v1/PROD/login")
        .withRequestBody(equalToJson("""{ "user" : "test_username", "password" : "test_password" }"""))
        .willReturn(aResponse().withBody("""
                                           |{
                                           |    "AccessToken": "test_access_token",
                                           |    "ExpiresIn": 3600,
                                           |    "TokenType": "Bearer",
                                           |    "RefreshToken": "test_refresh_token",
                                           |    "IdToken": "test_id_token"
                                           |}
                                           |""".stripMargin)))
  }

}
