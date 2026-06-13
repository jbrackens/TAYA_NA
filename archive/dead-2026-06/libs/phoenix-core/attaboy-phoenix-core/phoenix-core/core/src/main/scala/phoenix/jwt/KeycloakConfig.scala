package phoenix.jwt

import akka.actor.typed.ActorSystem
import pureconfig.ConfigSource
import pureconfig.generic.auto._

case class KeycloakConfig(clientConfLocation: String, username: String, password: String)

object KeycloakConfig {
  val PathRoot = "keycloak"

  def apply(system: ActorSystem[Nothing]): KeycloakConfig =
    ConfigSource.fromConfig(system.settings.config).at(PathRoot).loadOrThrow[KeycloakConfig]

  def fromString(config: String): KeycloakConfig =
    ConfigSource.string(config).at(PathRoot).loadOrThrow[KeycloakConfig]
}
