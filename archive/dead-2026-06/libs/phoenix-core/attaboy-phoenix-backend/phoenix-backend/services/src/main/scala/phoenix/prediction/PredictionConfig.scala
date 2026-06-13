package phoenix.prediction

import scala.concurrent.duration.FiniteDuration

import pureconfig.generic.auto._

import phoenix.core.config.BaseConfig
import phoenix.core.scheduler.ConfigCodecs._
import phoenix.core.scheduler.ScheduledJobConfig

final case class PredictionConfig(marketFactory: PredictionMarketFactoryConfig)

final case class PredictionMarketFactoryConfig(
    enabled: Boolean,
    btc: BtcMarketFactoryConfig)

final case class BtcMarketFactoryConfig(
    instrumentSymbol: String,
    defaultReferencePrice: BigDecimal,
    thresholds: List[BigDecimal],
    settlementSourceKey: String,
    fallbackSourceKey: Option[String],
    resolutionRule: String,
    marketOpenAhead: FiniteDuration,
    marketTradingWindow: FiniteDuration,
    periodicWorker: ScheduledJobConfig)

object PredictionConfig {
  object of extends BaseConfig[PredictionConfig]("phoenix.prediction")
}
