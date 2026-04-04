package phoenix.http.core

import scala.concurrent.Future

import cats.syntax.either._
import sttp.model.StatusCode
import sttp.tapir.Codec
import sttp.tapir.CodecFormat
import sttp.tapir.EndpointIO
import sttp.tapir.header

import phoenix.core.error.ErrorResponse
import phoenix.core.error.PresentationErrorCode
import phoenix.http.core.TapirAuthDirectives.ErrorOut

object GeolocationHeader {
  val geolocationHeaderKey: String = "X-Geolocation"

  val geolocationHeader: EndpointIO.Header[Option[Geolocation]] =
    header[Option[Geolocation]](geolocationHeaderKey)

  def ensureHeader[A](maybeGeolocation: Option[Geolocation])(
      body: Geolocation => Future[Either[ErrorOut, A]]): Future[Either[ErrorOut, A]] =
    maybeGeolocation.fold {
      Future.successful(
        ErrorResponse.tupled(StatusCode.BadRequest, PresentationErrorCode.GeolocationHeaderNotFound).asLeft[A])
    }(geolocation => body(geolocation))
}

// Placeholder until we know the exact format frontend will send
final case class Geolocation(value: String)

object Geolocation {
  implicit val geolocationCodec: Codec[String, Geolocation, CodecFormat.TextPlain] =
    Codec.string.map(Geolocation.apply _)(_.value)
}
