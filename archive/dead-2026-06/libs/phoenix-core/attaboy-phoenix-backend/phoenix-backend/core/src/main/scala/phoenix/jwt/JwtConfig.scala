package phoenix.jwt

import pureconfig.generic.auto._

import phoenix.core.config.BaseConfig

case class JwtConfig(requireJwtAuthentication: Boolean, defaultUserId: String)

object JwtConfig {
  object of extends BaseConfig[JwtConfig]("phoenix.jwt")
}
