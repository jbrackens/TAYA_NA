package phoenix.oddin

import com.typesafe.config.Config
import pureconfig.ConfigSource
import pureconfig.generic.auto._

import scala.concurrent.duration.{ DurationInt, FiniteDuration }

final case class CacheConfig(maxCapacity: Int, timeToLive: FiniteDuration, timeToIdle: FiniteDuration)

object CacheConfig {
  val Default: CacheConfig = CacheConfig(maxCapacity = 300, timeToLive = 24.hours, timeToIdle = 1.hour)

  def apply(config: Config, key: String): CacheConfig =
    ConfigSource.fromConfig(config).at(key).loadOrThrow[CacheConfig]
}
