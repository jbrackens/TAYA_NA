package stella.wallet.config

import scala.concurrent.duration.FiniteDuration

import com.typesafe.config.ConfigFactory
import pureconfig.generic.auto._

import stella.common.core.config.BaseConfig
import stella.common.http.config.OpenApiConfig
import stella.common.http.jwt.config.JwtConfig
import stella.common.models.Ids._
import stella.common.models.instances._

final case class WalletServerConfig(
    secretBoxHexKey: String,
    testUserId: UserId,
    testProjectId: ProjectId,
    jwt: JwtConfig,
    openApi: OpenApiConfig,
    walletAkka: WalletAkkaConfig)

object WalletServerConfig extends BaseConfig[WalletServerConfig]("stella.wallet.server") {
  def loadConfig(): WalletServerConfig = {
    val config = ConfigFactory.load()
    WalletServerConfig(config)
  }
}

final case class WalletAkkaConfig(
    startAkkaManagementAndClusterBootstrap: Boolean, // for k8s
    walletEntityAskTimeout: FiniteDuration,
    stateSnapshot: WalletStateSnapshotConfig,
    statePersistenceFailureRestart: WalletStatePersistenceFailureRestartConfig,
    walletTransactionProjection: WalletTransactionProjectionConfig)

final case class WalletStateSnapshotConfig(numberOfEvents: Int, keepNSnapshots: Int)

final case class WalletStatePersistenceFailureRestartConfig(
    minBackoff: FiniteDuration,
    maxBackoff: FiniteDuration,
    randomFactor: Double)

final case class WalletTransactionProjectionConfig(projectionName: String, numberOfShards: Int, parallelismLevel: Int)
