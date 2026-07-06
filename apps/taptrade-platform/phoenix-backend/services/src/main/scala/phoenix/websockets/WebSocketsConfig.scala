package phoenix.websockets

import scala.concurrent.duration.FiniteDuration

import pureconfig.generic.auto._

import phoenix.core.config.BaseConfig

final case class WebSocketsConfig(timeout: FiniteDuration)

object WebSocketsConfig {
  object of extends BaseConfig[WebSocketsConfig]("phoenix.web-sockets")
}
