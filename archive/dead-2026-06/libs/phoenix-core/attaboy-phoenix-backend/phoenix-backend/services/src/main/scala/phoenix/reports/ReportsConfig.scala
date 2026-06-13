package phoenix.reports

import pureconfig.generic.auto._

import phoenix.config.PhoenixProjectionConfig
import phoenix.core.CacheConfig
import phoenix.core.config.BaseConfig
import phoenix.core.ftp.SftpConfig
import phoenix.core.scheduler.ScheduledJobConfig
import phoenix.punters.domain.Email

final case class ReportsConfig(
    dge: DGEReportsConfig,
    aml: AMLReportsConfig,
    projections: ReportsProjectionsConfig,
    fixtureMarketCache: CacheConfig)

final case class DGEReportsConfig(sftp: SftpConfig, directory: String, dailyReports: ScheduledJobConfig)

final case class AMLReportsConfig(
    reportsRecipient: Email,
    dailyReports: ScheduledJobConfig,
    weeklyReports: ScheduledJobConfig,
    monthlyReports: ScheduledJobConfig,
    deceasedReports: ScheduledJobConfig,
    manuallyUnsuspendedPuntersReports: ScheduledJobConfig,
    multiDeviceActivityReports: ScheduledJobConfig)

final case class ReportsProjectionsConfig(
    betEvents: PhoenixProjectionConfig,
    markets: PhoenixProjectionConfig,
    fixtures: PhoenixProjectionConfig,
    bets: PhoenixProjectionConfig,
    wallets: PhoenixProjectionConfig,
    punters: PhoenixProjectionConfig,
    verificationData: PhoenixProjectionConfig,
    walletTransactions: PhoenixProjectionConfig,
    // TODO (PHXD-3293): remove after release of PHXD-3293
    walletPendingWithdrawals: PhoenixProjectionConfig)

object ReportsConfig {
  import phoenix.core.scheduler.ConfigCodecs._
  import phoenix.punters.ConfigCodecs._

  object of extends BaseConfig[ReportsConfig]("phoenix.reports")
}
