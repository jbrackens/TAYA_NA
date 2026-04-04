package phoenix.geocomply.support

import java.time.OffsetDateTime
import java.util.UUID

import phoenix.geocomply.domain.Decryption.EncryptedGeoPacket
import phoenix.geocomply.domain.License.Expiration
import phoenix.geocomply.domain.License.GeoComplyLicense
import phoenix.geocomply.domain.License.LicenseKey

object GeoComplyDataGenerator {

  def generateValidLicense(expirationDate: OffsetDateTime = OffsetDateTime.MAX): GeoComplyLicense =
    GeoComplyLicense(generateLicenseKey(), expires = Expiration(expirationDate))

  def generateLicenseKey(): LicenseKey =
    LicenseKey(UUID.randomUUID().toString)

  def generateEncryptedGeoPacket(): EncryptedGeoPacket =
    EncryptedGeoPacket(UUID.randomUUID().toString)
}
