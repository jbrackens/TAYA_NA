package phoenix.betgenius.infrastructure.http
import scala.concurrent.ExecutionContext
import scala.concurrent.Future

import akka.actor.ActorSystem
import akka.http.scaladsl.model.ContentTypes
import akka.http.scaladsl.model.HttpEntity
import akka.http.scaladsl.model.HttpMethods
import akka.http.scaladsl.model.HttpRequest
import akka.http.scaladsl.model.HttpResponse
import akka.http.scaladsl.model.headers.Authorization
import akka.http.scaladsl.model.headers.OAuth2BearerToken
import akka.http.scaladsl.model.headers.RawHeader
import akka.http.scaladsl.unmarshalling.Unmarshal
import akka.stream.Materializer
import io.circe.Decoder
import io.circe.Json
import io.circe.parser._

import phoenix.betgenius.domain._
import phoenix.betgenius.infrastructure.BetgeniusApiConfig
import phoenix.core.CacheConfig
import phoenix.core.CacheSupport
import phoenix.http.core.HttpClient

class AkkaHttpBetgeniusRestApi(httpClient: HttpClient, config: BetgeniusApiConfig)(implicit
    as: ActorSystem,
    ec: ExecutionContext,
    m: Materializer)
    extends BetgeniusRestApi
    with CacheSupport {

  private val idTokenCache =
    createCache[String, LoginResponse](as, CacheConfig(1, 10, config.loginTokenTtl, config.loginTokenTtl))

  private val apiKeyHeader = RawHeader("x-api-key", config.accessToken)

  override def getCompetition(competitionId: Int): Future[CompetitionResponse] = {
    for {
      loginResponse <- getLoginResponseOrLogin()
      response <- httpClient.sendRequest(
        HttpRequest(
          method = HttpMethods.GET,
          uri = uri(s"/Fixtures-v1/${config.environment}/competitions/$competitionId"),
          headers = Seq(apiKeyHeader, Authorization(OAuth2BearerToken(loginResponse.IdToken)))))
      json <- handleResponse[Json](response)
      competitionResponse <- parseCompetitionResponse(json)
    } yield competitionResponse
  }

  private def parseCompetitionResponse(json: Json) = {
    json.hcursor
      .downField("_embedded")
      .downField("competitions")
      .downN(0)
      .as[CompetitionResponse]
      .fold(Future.failed(_), Future.successful(_))
  }

  override def getESportFixtures(): Future[Seq[FixtureResponse]] = {
    for {
      loginResponse <- getLoginResponseOrLogin()
      response <- httpClient.sendRequest(
        HttpRequest(
          method = HttpMethods.GET,
          uri = uri(s"/Fixtures-v1/${config.environment}/sports/${config.eSportId}/fixtures"),
          headers = Seq(apiKeyHeader, Authorization(OAuth2BearerToken(loginResponse.IdToken)))))
      json <- handleResponse[Json](response)
      fixtureResponse <- parseFixturesResponse(json)
    } yield fixtureResponse

  }

  private def parseFixturesResponse(json: Json) = {
    json.hcursor
      .downField("_embedded")
      .downField("fixtures")
      .as[Seq[FixtureResponse]]
      .fold(Future.failed(_), Future.successful(_))
  }

  def getLoginResponseOrLogin(): Future[LoginResponse] = {
    idTokenCache.getOrLoad("login", _ => login())
  }

  private def login() = {
    val body = s"""{"user":"${config.username}","password":"${config.password}"}"""
    for {
      response <- httpClient.sendRequest(
        HttpRequest(
          method = HttpMethods.POST,
          uri = uri("/Auth-v1/PROD/login"),
          entity = HttpEntity(ContentTypes.`application/json`, body)))
      loginResponse <- handleResponse[LoginResponse](response)
    } yield loginResponse
  }

  private def handleResponse[T: Decoder](response: HttpResponse) = {
    Unmarshal(response).to[String].flatMap { s =>
      decode[T](s) match {
        case Left(error)     => Future.failed(error)
        case Right(response) => Future.successful(response)
      }
    }
  }

  private def uri(path: String) = s"${config.url}$path"
}
