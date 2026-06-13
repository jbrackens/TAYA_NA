package phoenix.bets

import pureconfig.ConfigReader
import pureconfig.generic.auto._

import phoenix.config.PhoenixProjectionConfig
import phoenix.core.config.BaseConfig
import phoenix.core.currency.MoneyAmount

final case class BetsConfig(projections: BetsProjectionsConfig, domain: BetsDomainConfig)
final case class BetsProjectionsConfig(
    betLifecycle: PhoenixProjectionConfig,
    readSideView: PhoenixProjectionConfig,
    punterBetsHistory: PhoenixProjectionConfig,
    marketLifecycle: PhoenixProjectionConfig)
final case class BetsDomainConfig(maximumAllowedStakeAmount: MaximumAllowedStakeAmount)

object BetsConfig {
  implicit val maximumAllowedStakeAmountConfigReader: ConfigReader[MaximumAllowedStakeAmount] =
    ConfigReader[BigDecimal].map(raw => MaximumAllowedStakeAmount(MoneyAmount(raw)))

  object of extends BaseConfig[BetsConfig]("phoenix.bets")
}
