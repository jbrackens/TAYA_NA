package phoenix.geocomply.support

import scala.concurrent.Future

import akka.http.scaladsl.model.ContentType
import akka.http.scaladsl.model.HttpCharsets
import akka.http.scaladsl.model.HttpEntity
import akka.http.scaladsl.model.HttpRequest
import akka.http.scaladsl.model.HttpResponse
import akka.http.scaladsl.model.MediaTypes
import akka.http.scaladsl.model.StatusCode

import phoenix.http.core.HttpClient

object HttpClientMock {

  final case class TestResponse(url: String, response: String)

  def withStatusCode(statusCode: StatusCode) =
    new HttpClient {
      override def sendRequest(httpRequest: HttpRequest, unsafeBypassTLS: Boolean): Future[HttpResponse] =
        Future.successful(HttpResponse(statusCode))
    }

  def withRequestValidation(responses: List[TestResponse]) =
    new HttpClient {

      private var responseList = responses

      override def sendRequest(httpRequest: HttpRequest, unsafeBypassTLS: Boolean): Future[HttpResponse] = {
        val nextResponse = responseList.head
        responseList = responseList.tail
        assertUri(httpRequest, nextResponse)
      }

      private def assertUri(httpRequest: HttpRequest, urlAndResponse: TestResponse): Future[HttpResponse] = {
        if (httpRequest.uri.toString().endsWith(urlAndResponse.url)) {
          val response = HttpResponse(entity = HttpEntity(urlAndResponse.response)
            .withContentType(ContentType(MediaTypes.`application/xml`, HttpCharsets.`UTF-8`)))
          Future.successful(response)
        } else {
          Future.failed(new RuntimeException(s"No response was configured for url '${httpRequest.uri}'"))
        }
      }
    }
}
