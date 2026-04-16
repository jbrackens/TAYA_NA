package phoenix.geocomply

import scala.concurrent.duration.FiniteDuration

import pureconfig.ConfigReader
import pureconfig.generic.auto._

import phoenix.core.config.BaseConfig
import phoenix.geocomply.domain.Decryption.DecryptionInitializationVector
import phoenix.geocomply.domain.Decryption.DecryptionKey
import phoenix.geocomply.domain.License.LicenseServerUri

final case class GeoComplyConfig(
    licenseServerUri: LicenseServerUri,
    delayPadding: FiniteDuration,
    decryptionInitializationVector: DecryptionInitializationVector,
    decryptionKey: DecryptionKey)

object GeoComplyConfig {
  object of extends BaseConfig[GeoComplyConfig]("phoenix.geocomply")

  implicit val apiKeyReader: ConfigReader[LicenseServerUri] = ConfigReader[String].map(LicenseServerUri.apply)
  implicit val decryptionInitializationVectorReader: ConfigReader[DecryptionInitializationVector] =
    ConfigReader[String].map(DecryptionInitializationVector.apply)
  implicit val decryptionKeyReader: ConfigReader[DecryptionKey] = ConfigReader[String].map(DecryptionKey.apply)
}
