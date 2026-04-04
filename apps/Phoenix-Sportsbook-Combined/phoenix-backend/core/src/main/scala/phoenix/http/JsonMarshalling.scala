package phoenix.http

import scala.concurrent.Future

import akka.http.scaladsl.marshalling.Marshaller
import akka.http.scaladsl.marshalling.ToEntityMarshaller
import akka.http.scaladsl.model.HttpEntity
import akka.http.scaladsl.model.MediaTypes.`application/json`
import akka.http.scaladsl.unmarshalling.FromEntityUnmarshaller
import akka.http.scaladsl.unmarshalling.Unmarshaller
import io.circe.Decoder
import io.circe.Encoder
import io.circe.parser.decode

object JsonMarshalling {
  implicit def marshaller[T: Encoder]: ToEntityMarshaller[T] =
    Marshaller.withFixedContentType(`application/json`) { t =>
      HttpEntity(`application/json`, Encoder[T].apply(t).noSpacesSortKeys)
    }
  private def errorMessage[T](json: String, err: Throwable): Future[T] =
    Future.failed(new RuntimeException(s"Parsing $json failed: ${err.getMessage}"))
  implicit def marshallerString: ToEntityMarshaller[String] = Marshaller.StringMarshaller
  implicit def unmarshaller[T: Decoder]: FromEntityUnmarshaller[T] =
    Unmarshaller.stringUnmarshaller
      .forContentTypes(`application/json`)
      .flatMap(_ => _ => json => decode[T](json).fold(errorMessage(json, _), Future.successful))
  implicit val unmarshallerString: FromEntityUnmarshaller[String] = Unmarshaller.stringUnmarshaller
}
