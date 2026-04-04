package phoenix.jwt

import akka.actor.typed.ActorSystem
import pureconfig.ConfigSource
import pureconfig.generic.auto._

case class JwtConfig(requireJwtAuthentication: Boolean, defaultUserId: String)

object JwtConfig {
  val PathRoot = "phoenix.jwt"

  def apply(system: ActorSystem[Nothing]): JwtConfig =
    ConfigSource.fromConfig(system.settings.config).at(PathRoot).loadOrThrow[JwtConfig]
}
