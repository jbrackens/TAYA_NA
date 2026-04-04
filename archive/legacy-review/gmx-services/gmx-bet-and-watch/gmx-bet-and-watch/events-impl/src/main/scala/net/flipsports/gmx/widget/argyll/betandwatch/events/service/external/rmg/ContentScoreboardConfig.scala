package net.flipsports.gmx.widget.argyll.betandwatch.events.service.external.rmg

import com.typesafe.config.Config
import pureconfig.ConfigSource

case class ContentScoreboardConfig(url: String, partnerId: Long, seed: String)

object ContentScoreboardConfig {

  def apply(config: Config, path: String = "app.external.rmg.csb-desktop"): ContentScoreboardConfig = {
    ConfigSource.fromConfig(config.getConfig(path)).loadOrThrow[ContentScoreboardConfig]
  }
}