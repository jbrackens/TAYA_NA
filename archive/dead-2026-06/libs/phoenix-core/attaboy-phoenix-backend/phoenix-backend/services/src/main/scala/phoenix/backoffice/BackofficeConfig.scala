package phoenix.backoffice

import pureconfig.generic.auto._

import phoenix.config.PhoenixProjectionConfig
import phoenix.core.config.BaseConfig

final case class BackofficeConfig(projections: BackofficeProjectionsConfig)
final case class BackofficeProjectionsConfig(betsForMarketExposure: PhoenixProjectionConfig)

object BackofficeConfig {
  object of extends BaseConfig[BackofficeConfig]("phoenix.backoffice")
}
