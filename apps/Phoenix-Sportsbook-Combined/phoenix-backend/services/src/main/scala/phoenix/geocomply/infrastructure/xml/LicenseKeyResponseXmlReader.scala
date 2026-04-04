package phoenix.geocomply.infrastructure.xml

import java.time.OffsetDateTime

import cats.syntax.apply._
import cats.syntax.validated._

import phoenix.core.TimeUtils._
import phoenix.core.XmlUtils.DefaultXmlAttributeReaders.stringAttributeReader
import phoenix.core.XmlUtils._
import phoenix.geocomply.domain.License.Expiration
import phoenix.geocomply.domain.License.GeoComplyLicense
import phoenix.geocomply.domain.License.LicenseKey

object LicenseKeyResponseXmlReader {

  implicit val expiresReader: XmlAttributeReader[Expiration] =
    node => node.readAttribute[String, OffsetDateTime]("expires", _.toUtcOffsetDateTime).map(Expiration.apply _)

  implicit val licenseKeyReader: XmlNodeReader[LicenseKey] =
    node => LicenseKey(node.text.trim).validNel

  implicit val licenseKeyResponseXmlReader: XmlNodeReader[GeoComplyLicense] =
    node => {
      val licenseKeyResult = node.convertTo[LicenseKey]
      val expiresResult = node.readAttribute[Expiration]

      (licenseKeyResult, expiresResult).mapN((licenseKey, expires) => GeoComplyLicense(licenseKey, expires))
    }
}
