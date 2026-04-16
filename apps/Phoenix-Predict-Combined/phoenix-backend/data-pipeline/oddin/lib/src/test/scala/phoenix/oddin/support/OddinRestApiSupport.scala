package phoenix.oddin.support

import scala.concurrent.Future

import akka.actor.typed.ActorSystem
import akka.http.scaladsl.model.ContentType
import akka.http.scaladsl.model.HttpCharsets
import akka.http.scaladsl.model.HttpEntity
import akka.http.scaladsl.model.HttpRequest
import akka.http.scaladsl.model.HttpResponse
import akka.http.scaladsl.model.MediaTypes
import akka.http.scaladsl.model.StatusCode
import org.scalatest.Assertions.fail

import phoenix.http.core.HttpClient
import phoenix.oddin.infrastructure.OddinApiConfig
import phoenix.oddin.infrastructure.http.AkkaHttpOddinRestApi
import phoenix.oddin.infrastructure.http.`X-Access-Token`

final case class TestResponse(url: String, response: String)

object OddinRestApiSupport {

  def createClient(apiConfig: OddinApiConfig, urlAndResponse: TestResponse)(implicit
      system: ActorSystem[_]): AkkaHttpOddinRestApi =
    new AkkaHttpOddinRestApi(HttpClientMock.withRequestValidation(urlAndResponse), apiConfig)

  def createFailingClient(apiConfig: OddinApiConfig, statusCode: StatusCode)(implicit
      system: ActorSystem[_]): AkkaHttpOddinRestApi =
    new AkkaHttpOddinRestApi(HttpClientMock.withStatusCode(statusCode), apiConfig)
}

object HttpClientMock {

  def withStatusCode(statusCode: StatusCode) =
    new HttpClient {
      override def sendRequest(httpRequest: HttpRequest, unsafeBypassTLS: Boolean): Future[HttpResponse] =
        Future.successful(HttpResponse(statusCode))
    }

  def withRequestValidation(urlAndResponse: TestResponse) =
    new HttpClient {
      override def sendRequest(httpRequest: HttpRequest, unsafeBypassTLS: Boolean): Future[HttpResponse] = {
        assertAccessToken(httpRequest)
        assertUri(httpRequest, urlAndResponse)
      }

      private def assertUri(httpRequest: HttpRequest, urlAndResponse: TestResponse): Future[HttpResponse] = {
        if (httpRequest.uri.toString().endsWith(urlAndResponse.url)) {
          val response = HttpResponse(entity = HttpEntity(urlAndResponse.response)
            .withContentType(ContentType(MediaTypes.`application/xml`, HttpCharsets.`UTF-8`)))
          Future.successful(response)
        } else {
          throw new RuntimeException(s"No response was configured for url '${httpRequest.uri}'")
        }
      }

      private def assertAccessToken(httpRequest: HttpRequest): Unit = {
        val maybeAccessTokenHeader = httpRequest.header[`X-Access-Token`]

        if (!maybeAccessTokenHeader.isDefined) {
          fail(message = "'X-Access-Token' header missing from request")
        } else if (maybeAccessTokenHeader.get.value.isEmpty) {
          fail(message = s"Empty value for 'X-Access-Token'")
        }
      }
    }
}
