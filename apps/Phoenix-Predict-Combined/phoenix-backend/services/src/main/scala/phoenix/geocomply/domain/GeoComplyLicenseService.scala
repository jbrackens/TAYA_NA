package phoenix.geocomply.domain

import scala.concurrent.Future

import cats.data.EitherT

import phoenix.geocomply.domain.GeoComplyLicenseService.FailedToRetrieveLicenseKey
import phoenix.geocomply.domain.License.GeoComplyLicense

trait GeoComplyLicenseService {
  def getLicenseKey(): EitherT[Future, FailedToRetrieveLicenseKey, GeoComplyLicense]
}

object GeoComplyLicenseService {
  final case class FailedToRetrieveLicenseKey(cause: String)
}
