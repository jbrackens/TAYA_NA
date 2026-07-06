package phoenix.geocomply.support

import scala.concurrent.ExecutionContext

import cats.data.EitherT

import phoenix.core.EitherTUtils._
import phoenix.geocomply.domain.GeoComplyLicenseService
import phoenix.geocomply.domain.GeoComplyLicenseService.FailedToRetrieveLicenseKey
import phoenix.geocomply.support.GeoComplyDataGenerator.generateValidLicense

object GeoComplyLicenseServiceMock {
  def successful()(implicit ec: ExecutionContext): GeoComplyLicenseService =
    () => EitherT.safeRightT(generateValidLicense())

  def failing()(implicit ec: ExecutionContext): GeoComplyLicenseService =
    () => EitherT.leftT(FailedToRetrieveLicenseKey("Because it's a test, and that's what we WANT to happen"))
}
