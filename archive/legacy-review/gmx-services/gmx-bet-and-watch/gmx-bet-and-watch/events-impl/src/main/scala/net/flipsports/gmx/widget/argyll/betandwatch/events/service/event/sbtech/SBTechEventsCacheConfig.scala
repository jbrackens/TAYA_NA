package net.flipsports.gmx.widget.argyll.betandwatch.events.service.event.sbtech

import com.typesafe.config.Config
import net.flipsports.gmx.common.internal.scala.core.jdk.DurationConverters._

import scala.concurrent.duration.FiniteDuration

case class SBTechEventsCacheConfig(cacheEnabled: Boolean, interval: FiniteDuration, daysBefore: Int, daysAhead: Int)

object SBTechEventsCacheConfig {
  def load(config: Config): SBTechEventsCacheConfig = SBTechEventsCacheConfig(
    true,
    config.getDuration("app.load-events.sbtech-cache.interval").asScala,
    config.getInt("app.load-events.sbtech-cache.days-before"),
    config.getInt("app.load-events.sbtech-cache.days-ahead")
  )
}