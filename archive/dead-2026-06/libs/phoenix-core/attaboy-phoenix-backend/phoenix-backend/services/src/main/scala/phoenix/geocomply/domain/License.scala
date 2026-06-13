package phoenix.geocomply.domain

import java.time.OffsetDateTime

import scala.math.Ordered.orderingToOrdered

object License {
  final case class LicenseServerUri(value: String)

  final case class GeoComplyLicense(licenseKey: LicenseKey, expires: Expiration) {
    def isNotExpiredAt(reference: OffsetDateTime): Boolean = reference < expires.value
  }

  final case class LicenseKey(value: String)
  final case class Expiration(value: OffsetDateTime)
}
