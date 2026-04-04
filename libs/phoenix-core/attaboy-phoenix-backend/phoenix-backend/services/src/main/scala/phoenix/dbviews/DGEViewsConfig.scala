package phoenix.dbviews

import pureconfig.generic.auto._

import phoenix.config.PhoenixProjectionConfig
import phoenix.core.config.BaseConfig

final case class DGEViewsConfig(projections: DGEViewsProjectionsConfig)

final case class DGEViewsProjectionsConfig(
    view01PatronDetails: PhoenixProjectionConfig,
    view02PatronSessions: PhoenixProjectionConfig,
    view03WalletTransfers: PhoenixProjectionConfig,
    view06SportsWagers: PhoenixProjectionConfig,
    view07CashTransactions: PhoenixProjectionConfig,
    view08PatronsGameLims: PhoenixProjectionConfig,
    view09PatronStatus: PhoenixProjectionConfig)

object DGEViewsConfig {
  object of extends BaseConfig[DGEViewsConfig]("phoenix.dge-views")
}
