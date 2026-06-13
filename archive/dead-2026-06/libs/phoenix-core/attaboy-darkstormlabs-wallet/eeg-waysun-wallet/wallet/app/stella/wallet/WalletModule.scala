package stella.wallet

import scala.concurrent.ExecutionContext

import akka.actor.typed.ActorSystem
import akka.cluster.sharding.typed.scaladsl.ClusterSharding
import akka.stream.Materializer
import com.softwaremill.macwire.wire
import com.softwaremill.macwire.wireWith
import com.typesafe.config.ConfigFactory
import slick.basic.DatabaseConfig
import slick.jdbc.JdbcProfile
import sttp.tapir.server.play.PlayServerInterpreter
import sttp.tapir.server.play.PlayServerOptions

import stella.common.core.Clock
import stella.common.core.JavaOffsetDateTimeClock
import stella.common.http.config.OpenApiConfig
import stella.common.http.jwt._

import stella.wallet.config.WalletAkkaConfig
import stella.wallet.config.WalletServerConfig
import stella.wallet.config.WalletTransactionProjectionConfig
import stella.wallet.db.currency.CurrencyRepository
import stella.wallet.db.currency.SlickCurrencyRepository
import stella.wallet.db.transaction._
import stella.wallet.routes.ApiRouter
import stella.wallet.routes.OpenApiRoutes
import stella.wallet.routes.WalletPlayServerOptions
import stella.wallet.routes.currency.CurrencyRoutes
import stella.wallet.routes.transaction.TransactionHistoryRoutes
import stella.wallet.routes.wallet.WalletRoutes
import stella.wallet.services._
import stella.wallet.services.projections.WalletTags
import stella.wallet.services.projections.WalletTransactionProjectionHandler

trait WalletModule {
  implicit def materializer: Materializer
  implicit def executionContext: ExecutionContext
  def typedActorSystem: ActorSystem[_]
  def clusterSharding: ClusterSharding

  lazy val config: WalletServerConfig = WalletServerConfig.loadConfig()
  lazy val walletAkkaConfig: WalletAkkaConfig = config.walletAkka
  lazy val walletTransactionProjectionConfig: WalletTransactionProjectionConfig =
    walletAkkaConfig.walletTransactionProjection
  lazy val dbConfig: DatabaseConfig[JdbcProfile] =
    DatabaseConfig.forConfig("slick", ConfigFactory.load())
  lazy val transactionHistoryDbConfig: TransactionReadDbConfig = new TransactionReadDbConfig(
    DatabaseConfig.forConfig("transaction-read.slick", ConfigFactory.load()))

  lazy val clock: Clock = JavaOffsetDateTimeClock
  lazy val currencyIdProvider: CurrencyIdProvider = RandomUuidMessageIdProvider
  lazy val currencyRepository: CurrencyRepository = wire[SlickCurrencyRepository]
  lazy val transactionReadRepository: TransactionReadRepository = wire[SlickTransactionReadRepository]
  lazy val transactionWriteRepository: TransactionWriteRepository = wire[SlickTransactionWriteRepository]

  lazy val walletTags: WalletTags = new WalletTags(walletTransactionProjectionConfig.numberOfShards)
  lazy val walletShardingRegion: WalletShardingRegion = wire[WalletShardingRegion]
  lazy val walletTransactionProjectionHandler: WalletTransactionProjectionHandler =
    wire[WalletTransactionProjectionHandler]

  lazy val walletBoundedContext: WalletBoundedContext = wire[ActorWalletBoundedContext]

  implicit lazy val jwtAuthorization: JwtAuthorization[StellaAuthContext] = wireWith(createJwtAuthorizationInstance _)
  lazy val openApiConfig: OpenApiConfig = config.openApi

  lazy val serverOptions: PlayServerOptions = wireWith(WalletPlayServerOptions.instance _)
  lazy val serverInterpreter: PlayServerInterpreter = PlayServerInterpreter.apply(serverOptions)(materializer)

  lazy val currencyRoutes: CurrencyRoutes = wire[CurrencyRoutes]
  lazy val walletRoutes: WalletRoutes = wire[WalletRoutes]
  lazy val transactionRoutes: TransactionHistoryRoutes = wire[TransactionHistoryRoutes]
  lazy val openApiRoutes: OpenApiRoutes = wire[OpenApiRoutes]

  lazy val apiRouter: ApiRouter = wire[ApiRouter]

  private def createJwtAuthorizationInstance(config: WalletServerConfig): JwtAuthorization[StellaAuthContext] = {
    val jwtConfig = config.jwt
    if (jwtConfig.requireJwtAuth) {
      val oidcPropertiesProvider = new OidcDiscovery(jwtConfig)
      val authContextExtractor = new SecretBoxAuthContextExtractor(config.secretBoxHexKey)
      new JwksBasedJwtAuthorization[StellaAuthContext](jwtConfig, oidcPropertiesProvider, authContextExtractor)
    } else new DisabledJwtAuthorization(dummyUserId = config.testUserId, dummyProjectId = config.testProjectId)
  }
}
