package net.flipsports.gmx.widget.argyll.betandwatch.events.service.external.sis

import com.typesafe.config.Config
import pureconfig.ConfigSource

case class StreamAPIConfig(url: String, customer: String, seed: String)

object StreamAPIConfig {

  def apply(config: Config, path: String = "app.external.sis.stream-api"): StreamAPIConfig = {
    ConfigSource.fromConfig(config.getConfig(path)).loadOrThrow[StreamAPIConfig]
  }
}