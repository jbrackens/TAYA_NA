package net.flipsports.gmx.widget.argyll.betandwatch.events.service.event.rmg

import com.typesafe.config.Config
import pureconfig.ConfigSource

import scala.concurrent.duration.FiniteDuration

case class RMGEventsCacheConfig(enabled: Boolean, interval: FiniteDuration)

object RMGEventsCacheConfig {

  def apply(config: Config, path: String = "app.load-events.rmg-cache"): RMGEventsCacheConfig = {
    ConfigSource.fromConfig(config.getConfig(path)).loadOrThrow[RMGEventsCacheConfig]
  }
}