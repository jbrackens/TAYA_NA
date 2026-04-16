package phoenix

import scala.concurrent.ExecutionContext
import scala.concurrent.Future

import akka.actor.ActorSystem
import akka.http.scaladsl.Http
import akka.http.scaladsl.HttpExt
import akka.http.scaladsl.model.ContentType
import akka.http.scaladsl.model.HttpEntity
import akka.http.scaladsl.model.HttpHeader
import akka.http.scaladsl.model.HttpMethods
import akka.http.scaladsl.model.HttpRequest
import akka.http.scaladsl.model.HttpResponse
import akka.http.scaladsl.model.MediaTypes
import akka.http.scaladsl.model.Uri
import akka.http.scaladsl.unmarshalling.FromEntityUnmarshaller
import akka.http.scaladsl.unmarshalling.Unmarshal
import akka.http.scaladsl.unmarshalling.Unmarshaller
import io.circe.Decoder
import io.circe.Encoder
import io.circe.parser.decode
import org.slf4j.Logger
import org.slf4j.LoggerFactory

trait HttpSupport {

  private def errorMessage[T](json: String, err: Throwable): Future[T] =
    Future.failed(new RuntimeException(s"Parsing $json failed: ${err.getMessage}"))
  private implicit def unmarshaller[T: Decoder]: FromEntityUnmarshaller[T] =
    Unmarshaller.stringUnmarshaller
      .forContentTypes(MediaTypes.`application/json`)
      .flatMap(_ => _ => json => decode[T](json).fold(errorMessage(json, _), Future.successful))

  implicit val system: ActorSystem = ActorSystem()
  implicit val ec: ExecutionContext = system.dispatcher

  lazy val httpClient: HttpExt = Http()

  protected val log: Logger = LoggerFactory.getLogger(getClass)

  def getCodec[Response: Decoder](uri: String, headers: HttpHeader*): Future[Response] = {
    for {
      response <-
        httpClient.singleRequest(HttpRequest(uri = Uri(uri), method = HttpMethods.GET, headers = Seq(headers: _*)))
      _ = if (response.status.isFailure) {
        log.error(s"request (GET $uri) status code: ${response.status}")
      }
      body <- Unmarshal(response).to[Response]
    } yield body
  }

  def postNoReturn[Request: Encoder](uri: String, body: Request, headers: HttpHeader*): Future[HttpResponse] =
    makePostRequestCodec(uri, body, headers)

  def postCodec[Request: Encoder, Response: Decoder](
      uri: String,
      body: Request,
      headers: HttpHeader*): Future[Response] =
    makePostRequestCodec(uri, body, headers).flatMap(Unmarshal(_).to[Response])

  private def makePostRequestCodec[Request: Encoder](
      uri: String,
      body: Request,
      headers: Seq[HttpHeader]): Future[HttpResponse] =
    for {
      response <- httpClient.singleRequest(
        HttpRequest(
          uri = Uri(uri),
          method = HttpMethods.POST,
          entity = HttpEntity(Encoder[Request].apply(body).noSpacesSortKeys)
            .withContentType(ContentType(MediaTypes.`application/json`)),
          headers = headers))
      _ = if (response.status.isFailure) {
        log.error(s"request (POST $uri) status code: ${response.status}")
      }
    } yield response
}
