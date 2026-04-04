package net.flipsports.gmx.widget.argyll.betandwatch.events.service.bet

import com.typesafe.config.Config
import net.flipsports.gmx.common.internal.scala.core.jdk.DurationConverters._

import scala.concurrent.duration.FiniteDuration

case class BetsConfig(lookupEnabled: Boolean, interval: FiniteDuration)

object BetsConfig {
  def load(config: Config): BetsConfig = BetsConfig(
    true,
    config.getDuration("app.user-bets.mapping.interval").asScala
  )
}
