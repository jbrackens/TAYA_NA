package phoenix.geocomply.domain

import scala.concurrent.Future

import cats.data.EitherT

import phoenix.geocomply.domain.Decryption.EncryptedGeoPacket
import phoenix.geocomply.domain.GeoComplyLocationService.GeoLocationError
import phoenix.geocomply.domain.GeoLocation.GeoLocationResponse

trait GeoComplyLocationService {
  def evaluateGeoPacket(encryptedGeoPacket: EncryptedGeoPacket): EitherT[Future, GeoLocationError, GeoLocationResponse]
}

object GeoComplyLocationService {

  sealed trait GeoLocationError
  final case object FailedToDecryptGeoPacket extends GeoLocationError
  final case object FailedToParseGeoPacket extends GeoLocationError
  final case object GeoComplyEngineError extends GeoLocationError
}
