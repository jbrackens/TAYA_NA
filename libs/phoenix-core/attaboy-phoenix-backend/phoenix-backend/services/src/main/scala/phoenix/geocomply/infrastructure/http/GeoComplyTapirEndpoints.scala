package phoenix.geocomply.infrastructure.http

import sttp.model.StatusCode
import sttp.tapir._
import sttp.tapir.codec.enumeratum.TapirCodecEnumeratum
import sttp.tapir.generic.auto._

import phoenix.core.error.ErrorResponse
import phoenix.geocomply.domain.Decryption.EncryptedGeoPacket
import phoenix.geocomply.domain.GeoLocation.GeoLocationResponse
import phoenix.geocomply.domain.License.LicenseKey
import phoenix.geocomply.infrastructure.json.GeoComplyJsonFormats._
import phoenix.http.routes.HttpBody.jsonBody

object GeoComplyTapirEndpoints extends TapirCodecEnumeratum {

  def licenseKey =
    endpoint.get
      .in("geo-comply" / "license-key")
      .out(jsonBody[LicenseKey])
      .out(statusCode(StatusCode.Ok))
      .errorOut(statusCode)
      .errorOut(jsonBody[ErrorResponse])

  def evaluateGeoPacket =
    endpoint.post
      .in("geo-comply" / "geo-packet")
      .in(jsonBody[EncryptedGeoPacket])
      .out(jsonBody[GeoLocationResponse])
      .out(statusCode(StatusCode.Ok))
      .errorOut(statusCode)
      .errorOut(jsonBody[ErrorResponse])

}
