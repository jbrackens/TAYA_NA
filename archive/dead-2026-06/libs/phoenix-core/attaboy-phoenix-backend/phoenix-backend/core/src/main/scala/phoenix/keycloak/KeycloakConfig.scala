package phoenix.keycloak

import pureconfig.generic.auto._

import phoenix.core.config.BaseConfig

final case class KeycloakConfig(clientConfLocation: String)

object KeycloakConfig {
  object of extends BaseConfig[KeycloakConfig]("keycloak")
}
