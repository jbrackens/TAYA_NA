package phoenix.wallets

import pureconfig.generic.auto._

import phoenix.config.PhoenixProjectionConfig
import phoenix.core.config.BaseConfig
import phoenix.core.scheduler.ConfigCodecs._
import phoenix.core.scheduler.ScheduledJobConfig

/**
 * Wallets Bounded Context Configuration
 *
 * In order to keep each Bounded Context independent (and potentially be used by other applications in the future)
 * each one should be able to load the config values required for instantiation on its own. There shouldn't be a
 * noticeable overhead, as we'll be using the Akka System's configuration and the different Bounded Contexts should
 * create the configs in parallel.
 */
case class WalletsConfig(
    projections: WalletsProjectionsConfig,
    consumeResponsibilityCheckTasks: ConsumeResponsibilityCheckTasks)

final case class WalletsProjectionsConfig(
    walletTransactionsView: PhoenixProjectionConfig,
    responsibilityCheckTaskScheduling: PhoenixProjectionConfig,
    betFinalizer: PhoenixProjectionConfig,
    walletPunterStatus: PhoenixProjectionConfig)

final case class ConsumeResponsibilityCheckTasks(periodicWorker: ScheduledJobConfig)

object WalletsConfig {
  object of extends BaseConfig[WalletsConfig]("phoenix.wallets")
}
