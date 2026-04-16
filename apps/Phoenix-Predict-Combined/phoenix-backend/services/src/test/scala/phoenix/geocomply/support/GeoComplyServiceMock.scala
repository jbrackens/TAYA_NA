package phoenix.geocomply.support

import scala.concurrent.ExecutionContext

import cats.data.EitherT

import phoenix.core.EitherTUtils._
import phoenix.geocomply.domain.Decryption.EncryptedGeoPacket
import phoenix.geocomply.domain.GeoComplyLocationService
import phoenix.geocomply.domain.GeoComplyLocationService.FailedToDecryptGeoPacket
import phoenix.geocomply.domain.GeoLocation.AnotherGeolocationInSeconds
import phoenix.geocomply.domain.GeoLocation.GeoLocationPassed

object GeoComplyServiceMock {
  def successful()(implicit ec: ExecutionContext): GeoComplyLocationService =
    (_: EncryptedGeoPacket) => EitherT.safeRightT(GeoLocationPassed(AnotherGeolocationInSeconds(30)))

  def failing()(implicit ec: ExecutionContext): GeoComplyLocationService =
    (_: EncryptedGeoPacket) => EitherT.leftT(FailedToDecryptGeoPacket)
}
