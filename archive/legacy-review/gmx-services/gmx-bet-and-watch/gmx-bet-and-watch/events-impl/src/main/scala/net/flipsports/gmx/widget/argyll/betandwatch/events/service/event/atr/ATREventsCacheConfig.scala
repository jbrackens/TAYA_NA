package net.flipsports.gmx.widget.argyll.betandwatch.events.service.event.atr

import com.typesafe.config.Config
import net.flipsports.gmx.common.internal.scala.core.jdk.DurationConverters._

import scala.concurrent.duration.FiniteDuration

case class ATREventsCacheConfig(providerEnabled: Boolean, interval: FiniteDuration, daysBefore: Int, daysAhead: Int)

object ATREventsCacheConfig {
  def load(config: Config): ATREventsCacheConfig = ATREventsCacheConfig(
    config.getBoolean("app.load-events.atr-cache.enabled"),
    config.getDuration("app.load-events.atr-cache.interval").asScala,
    config.getInt("app.load-events.atr-cache.days-before"),
    config.getInt("app.load-events.atr-cache.days-ahead"),
  )
}