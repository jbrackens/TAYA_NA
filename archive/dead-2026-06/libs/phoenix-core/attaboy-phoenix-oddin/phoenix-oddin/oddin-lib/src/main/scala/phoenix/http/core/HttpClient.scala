package phoenix.http.core

import akka.actor.ActorSystem
import akka.http.scaladsl.Http
import akka.http.scaladsl.model.{ HttpRequest, HttpResponse }

import scala.concurrent.Future

trait HttpClient {
  def sendRequest(httpRequest: HttpRequest): Future[HttpResponse]
}

trait AkkaHttpClient extends HttpClient {
  implicit def system: ActorSystem

  override def sendRequest(httpRequest: HttpRequest): Future[HttpResponse] =
    Http().singleRequest(httpRequest)

  def shutDown(): Unit =
    Http().shutdownAllConnectionPools()
}
