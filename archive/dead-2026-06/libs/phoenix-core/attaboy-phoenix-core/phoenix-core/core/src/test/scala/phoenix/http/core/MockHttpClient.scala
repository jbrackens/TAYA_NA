package phoenix.http.core

import akka.http.scaladsl.model.{ HttpRequest, HttpResponse }
import org.scalamock.scalatest.MockFactory

import scala.concurrent.Future

trait MockHttpClient extends HttpClient with MockFactory {
  val mock = mockFunction[HttpRequest, Future[HttpResponse]]

  override def sendRequest(httpRequest: HttpRequest): Future[HttpResponse] =
    mock(httpRequest)
}
