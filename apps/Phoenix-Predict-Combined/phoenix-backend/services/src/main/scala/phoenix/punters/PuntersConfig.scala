package phoenix.punters

import java.nio.file.Path

import pureconfig.ConfigReader
import pureconfig.generic.auto._

import phoenix.config.PhoenixProjectionConfig
import phoenix.core.config.BaseConfig
import phoenix.core.ftp.SftpConfig
import phoenix.core.scheduler.ConfigCodecs._
import phoenix.core.scheduler.ScheduledJobConfig
import phoenix.punters.exclusion.domain.LicenseId
import phoenix.punters.exclusion.domain.SkinId
import phoenix.punters.idcomply.application.MaximumAmountOfPunters
import phoenix.utils.cryptography.EncryptionPassword

final case class PuntersConfig(
    projections: PuntersProjectionsConfig,
    coolOff: PunterCoolOffConfig,
    sessionLimits: SessionLimitsConfig,
    excludedUsers: ExcludedUsersConfig,
    ssnEncryptionPassword: EncryptionPassword,
    domain: PuntersDomainConfig)
final case class PuntersProjectionsConfig(
    punterCoolOff: PhoenixProjectionConfig,
    punterNotifications: PhoenixProjectionConfig,
    walletNotifications: PhoenixProjectionConfig,
    sessionLimits: PhoenixProjectionConfig,
    limitsHistory: PhoenixProjectionConfig,
    coolOffsHistory: PhoenixProjectionConfig,
    selfExcludedPunters: PhoenixProjectionConfig,
    punterStatus: PhoenixProjectionConfig)
final case class PunterCoolOffConfig(periodicWorker: ScheduledJobConfig)
final case class SessionLimitsConfig(periodicWorker: ScheduledJobConfig)
final case class ExcludedUsersConfig(
    sftp: SftpConfig,
    excludedUsersIngestion: ExcludedUsersIngestionConfig,
    excludedUsersReport: ExcludedUsersReportConfig)
final case class ExcludedUsersIngestionConfig(
    periodicWorker: ScheduledJobConfig,
    directory: String,
    ingestionFile: String) {

  def ingestionFilePath: Path =
    Path.of(directory, ingestionFile)
}
final case class ExcludedUsersReportConfig(
    periodicWorker: ScheduledJobConfig,
    directory: String,
    reportFile: String,
    skinId: SkinId,
    licenseId: LicenseId) {

  def reportPath: Path =
    Path.of(directory, reportFile)
}

final case class PuntersDomainConfig(maximumAmountOfPunters: MaximumAmountOfPunters, mfa: MFAConfig)
final case class MFAConfig(enabledByDefault: Boolean, changeAllowed: Boolean, mandatoryForRegistration: Boolean)

object PuntersConfig {
  implicit val encryptionPasswordConfigReader: ConfigReader[EncryptionPassword] =
    ConfigReader[String].map(EncryptionPassword)
  implicit val licenseIdConfigReader: ConfigReader[LicenseId] =
    ConfigReader[String].map(LicenseId)
  implicit val skinIdConfigReader: ConfigReader[SkinId] =
    ConfigReader[String].map(SkinId)
  implicit val maximumAmountOfPuntersConfigReader: ConfigReader[MaximumAmountOfPunters] =
    ConfigReader[Int].map(MaximumAmountOfPunters)

  object of extends BaseConfig[PuntersConfig]("phoenix.punters")
}
