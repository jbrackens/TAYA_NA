package net.flipsports.gmx.widget.argyll.betandwatch.events.service.event

import com.typesafe.config.Config
import net.flipsports.gmx.common.internal.scala.core.jdk.DurationConverters._

import scala.concurrent.duration.FiniteDuration

case class EventsLookupConfig(enabled: Boolean, interval: FiniteDuration, daysBefore: Int, daysAhead: Int, includeTestData: Boolean)

object EventsLookupConfig {
  def load(config: Config): EventsLookupConfig = EventsLookupConfig(
    true,
    config.getDuration("app.load-events.mapping.interval").asScala,
    config.getInt("app.load-events.mapping.days-before"),
    config.getInt("app.load-events.mapping.days-ahead"),
    config.getBoolean("app.load-events.mapping.include-test-data")
  )
}