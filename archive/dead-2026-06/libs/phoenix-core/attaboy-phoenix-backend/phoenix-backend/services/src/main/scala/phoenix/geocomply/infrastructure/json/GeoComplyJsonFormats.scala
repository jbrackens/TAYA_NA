package phoenix.geocomply.infrastructure.json

import io.circe.Codec
import io.circe.Encoder
import io.circe.Json
import io.circe.generic.semiauto._
import io.circe.syntax._

import phoenix.core.JsonFormats._
import phoenix.geocomply.domain.Decryption.EncryptedGeoPacket
import phoenix.geocomply.domain.GeoLocation
import phoenix.geocomply.domain.GeoLocation.AnotherGeolocationInSeconds
import phoenix.geocomply.domain.GeoLocation.GeoLocationPassed
import phoenix.geocomply.domain.GeoLocation.GeoLocationRejected
import phoenix.geocomply.domain.GeoLocation.GeoLocationResponse
import phoenix.geocomply.domain.GeoLocation.TroubleshooterMessage
import phoenix.geocomply.domain.License.LicenseKey

object GeoComplyJsonFormats {

  implicit val licenseKeyCodec: Codec[LicenseKey] = deriveCodec
  implicit val encryptedGeoPacketCodec: Codec[EncryptedGeoPacket] = deriveCodec
  implicit val anotherGeolocationInSecondsEncoder: Encoder[AnotherGeolocationInSeconds] =
    Encoder.encodeInt.contramap(_.value)
  implicit val troubleshooterMessageCodec: Codec[TroubleshooterMessage] =
    deriveCodec[TroubleshooterMessage].dropNullValues

  implicit val errorSummaryCauseCodec: Codec[GeoLocation.ErrorSummaryCause] = enumCodec(GeoLocation.ErrorSummaryCause)
  implicit val geoLocationSuccessEncoder: Encoder[GeoLocationPassed] = deriveEncoder
  implicit val geoLocationFailureCodec: Codec[GeoLocationRejected] = deriveCodec

  implicit val geoLocationResponseCodec: Encoder[GeoLocationResponse] = Encoder.instance(_ match {
    case passed: GeoLocationPassed     => passed.asJson.mapObject(_.add("result", Json.fromString("PASSED")))
    case rejected: GeoLocationRejected => rejected.asJson.mapObject(_.add("result", Json.fromString("REJECTED")))
  })
}
