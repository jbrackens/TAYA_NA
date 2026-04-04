package phoenix.http.routes.dev

import pureconfig.ConfigReader
import pureconfig.generic.auto._

import phoenix.core.config.BaseConfig

final case class DevRoutesConfiguration(username: DevRoutesUsername, password: DevRoutesPassword)

final case class DevRoutesUsername(value: String)
final case class DevRoutesPassword(value: String)

object DevRoutesConfiguration {
  implicit val usernameReader: ConfigReader[DevRoutesUsername] = ConfigReader[String].map(DevRoutesUsername)
  implicit val passwordReader: ConfigReader[DevRoutesPassword] = ConfigReader[String].map(DevRoutesPassword)

  object of extends BaseConfig[DevRoutesConfiguration]("phoenix.dev-routes")
}
