package net.flipsports.gmx.widget.argyll.betandwatch.events.service.bet

import com.typesafe.config.Config
import net.flipsports.gmx.common.internal.scala.core.jdk.DurationConverters._

import scala.concurrent.duration.FiniteDuration

case class SBTechBetsCacheConfig(cacheEnabled: Boolean, interval: FiniteDuration, daysBefore: Int, segmentSize: FiniteDuration, segmentOverlap: FiniteDuration)

object SBTechBetsCacheConfig {
  def load(config: Config): SBTechBetsCacheConfig = SBTechBetsCacheConfig(
    config.getBoolean("app.user-bets.sbtech-cache.enabled"),
    config.getDuration("app.user-bets.sbtech-cache.interval").asScala,
    config.getInt("app.user-bets.sbtech-cache.days-before"),
    config.getDuration("app.user-bets.sbtech-cache.segment-size").asScala,
    config.getDuration("app.user-bets.sbtech-cache.segment-overlap").asScala,
  )
}