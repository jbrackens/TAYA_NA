package stella.wallet.it

import com.typesafe.config.Config
import com.typesafe.config.ConfigFactory
import org.scalamock.scalatest.MockFactory
import org.scalatestplus.play.FakeApplicationFactory
import play.api.Application
import play.api.ApplicationLoader
import play.api.Environment
import slick.basic.DatabaseConfig
import slick.jdbc.JdbcProfile

import stella.common.core.Clock
import stella.common.core.JavaOffsetDateTimeClock
import stella.common.http.jwt.DisabledJwtAuthorization
import stella.common.http.jwt.JwtAuthorization
import stella.common.http.jwt.StellaAuthContext

import stella.wallet.WalletComponents
import stella.wallet.WalletModule
import stella.wallet.db.transaction.TransactionReadDbConfig
import stella.wallet.it.utils.RandomUuidMessageIdProviderWithMemoization
import stella.wallet.services.CurrencyIdProvider

trait IntegrationTestApplicationFactory extends FakeApplicationFactory with MockFactory {

  protected lazy val configForDbAccess: Config = ConfigFactory.load()
  protected lazy val transactionReadDbConfig: Config = ConfigFactory.load()
  protected lazy val jwtAuth: JwtAuthorization[StellaAuthContext] = new DisabledJwtAuthorization()
  protected lazy val testClock: Clock = JavaOffsetDateTimeClock
  protected val testCurrencyIdProvider: RandomUuidMessageIdProviderWithMemoization.type =
    RandomUuidMessageIdProviderWithMemoization
  protected var walletModule: WalletModule = _
  protected lazy val initialSettings: Map[String, AnyRef] = Map.empty

  override def fakeApplication(): Application = {
    val env = Environment.simple()
    val context = ApplicationLoader.Context.create(env, initialSettings)
    val components = new WalletComponents(context) {
      override lazy val dbConfig: DatabaseConfig[JdbcProfile] =
        DatabaseConfig.forConfig("slick", configForDbAccess)
      override lazy val transactionHistoryDbConfig: TransactionReadDbConfig = new TransactionReadDbConfig(
        DatabaseConfig.forConfig("transaction-read.slick", transactionReadDbConfig))
      override lazy val clock: Clock = testClock
      override lazy val currencyIdProvider: CurrencyIdProvider = testCurrencyIdProvider
      override implicit lazy val jwtAuthorization: JwtAuthorization[StellaAuthContext] = jwtAuth
    }
    walletModule = components
    components.application
  }
}
