package net.flipsports.gmx.widget.argyll.betandwatch.events.service.event.sis

import com.typesafe.config.Config
import net.flipsports.gmx.common.internal.scala.core.jdk.DurationConverters._

import scala.concurrent.duration.FiniteDuration

case class SISEventsCacheConfig(providerEnabled: Boolean, interval: FiniteDuration)

object SISEventsCacheConfig {
  def load(config: Config): SISEventsCacheConfig = SISEventsCacheConfig(
    config.getBoolean("app.load-events.sis-cache.enabled"),
    config.getDuration("app.load-events.sis-cache.interval").asScala
  )
}