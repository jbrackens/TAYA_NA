package phoenix

import akka.http.scaladsl.model.Uri
import pureconfig.ConfigReader
import pureconfig.ConfigSource
import pureconfig.generic.auto._

final case class Config(phoenix: PhoenixConfig, pxp: PxpConfig)
final case class PhoenixConfig(
    publicApiUrl: Uri,
    webSocketsUrl: Uri,
    devApiUrl: Uri,
    devApiCredentials: ConfigCredentials)
final case class PxpConfig(enablePxpTests: Boolean, apiUrl: Uri, apiCredentials: ConfigCredentials, merchantId: String, shopId: String)
final case class ConfigCredentials(username: String, password: String)

object Config {
  implicit val uriReader: ConfigReader[Uri] = ConfigReader.stringConfigReader.map(Uri(_))
  lazy val instance: Config = ConfigSource.default.loadOrThrow[Config]
}
