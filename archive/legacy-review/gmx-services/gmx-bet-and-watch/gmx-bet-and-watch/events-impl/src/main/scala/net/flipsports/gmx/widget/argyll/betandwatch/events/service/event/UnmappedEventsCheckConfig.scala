package net.flipsports.gmx.widget.argyll.betandwatch.events.service.event

import com.typesafe.config.Config
import net.flipsports.gmx.common.internal.scala.core.jdk.DurationConverters._

import scala.concurrent.duration.FiniteDuration

case class UnmappedEventsCheckConfig(verificationEnabled: Boolean, interval: FiniteDuration)

object UnmappedEventsCheckConfig {
  def load(config: Config): UnmappedEventsCheckConfig = UnmappedEventsCheckConfig(
    true,
    config.getDuration("app.load-events.check.interval").asScala
  )
}

