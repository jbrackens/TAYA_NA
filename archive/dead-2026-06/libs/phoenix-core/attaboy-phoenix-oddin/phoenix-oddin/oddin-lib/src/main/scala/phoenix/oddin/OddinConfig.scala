package phoenix.oddin

import akka.actor.typed.ActorSystem
import com.typesafe.config.Config
import pureconfig.ConfigSource
import pureconfig.generic.auto._

case class OddinConfig(isProduction: Boolean, uri: String, accessToken: String)

object OddinConfig {

  val PathRoot = "phoenix.oddin"

  def apply(system: ActorSystem[Nothing]): OddinConfig =
    this(system.settings.config)

  def apply(config: Config): OddinConfig =
    ConfigSource.fromConfig(config).at(PathRoot).loadOrThrow[OddinConfig]
}
