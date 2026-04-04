package phoenix.support

import scala.concurrent.ExecutionContext

import akka.actor.typed.ActorSystem
import slick.basic.DatabaseConfig
import slick.jdbc.JdbcProfile

import phoenix.backoffice.ActorBackofficeBoundedContext
import phoenix.backoffice.MarketExposureReadRepository
import phoenix.bets.ActorBetsBoundedContext
import phoenix.bets.AlwaysValidGeolocationValidator
import phoenix.bets.BetProjectionRunner
import phoenix.bets.BetsBoundedContext
import phoenix.bets.BetsConfig
import phoenix.bets.GeolocationValidator
import phoenix.bets.infrastructure.SlickMarketBetsRepository
import phoenix.bets.infrastructure.SlickPunterStakesRepository
import phoenix.bets.infrastructure.akka.AkkaBetEventStreams
import phoenix.bets.infrastructure.akka.BetEventsWebsocketSingleton
import phoenix.core.Clock
import phoenix.core.currency.DefaultCurrencyMoney
import phoenix.core.emailing.EmailingModule
import phoenix.core.emailing.Mailer
import phoenix.core.scheduler.SchedulerModule
import phoenix.http.core.AkkaHttpClient
import phoenix.jwt.JwtAuthenticator
import phoenix.keycloak.KeycloakConfig
import phoenix.keycloak.KeycloakTokenVerifier
import phoenix.markets.ActorMarketsBoundedContext
import phoenix.markets.MarketProjectionRunner
import phoenix.markets.MarketsBoundedContext
import phoenix.markets.fixtures.infrastructure.akka.AkkaFixtureEventStreams
import phoenix.markets.fixtures.infrastructure.akka.FixtureEventsWebsocketSingleton
import phoenix.markets.infrastructure.akka.AkkaMarketEventStreams
import phoenix.markets.infrastructure.akka.MarketEventsWebsocketSingleton
import phoenix.notes.infrastructure.SlickNoteRepository
import phoenix.payments.PaymentsModule
import phoenix.payments.infrastructure.InMemoryTransactionRepository
import phoenix.payments.infrastructure.PaymentsConfig
import phoenix.payments.infrastructure.SlickCashWithdrawalReservationsRepository
import phoenix.payments.infrastructure.SlickPaymentNotificationsRepository
import phoenix.payments.support.PaymentsServiceMock
import phoenix.punters.ActorPuntersBoundedContext
import phoenix.punters.NotificationsConfig
import phoenix.punters.PuntersBoundedContext
import phoenix.punters.PuntersConfig
import phoenix.punters.exclusion.support.InMemoryExcludedPlayersRepository
import phoenix.punters.infrastructure.KeycloakAuthenticationRepository
import phoenix.punters.infrastructure.SlickTermsAndConditionsRepository
import phoenix.punters.support.InMemoryPuntersRepository
import phoenix.support.TestScenarios.RandomPunter
import phoenix.utils.RandomUUIDGenerator
import phoenix.utils.UUIDGenerator
import phoenix.wallets.ActorWalletsBoundedContext
import phoenix.wallets.WalletProjectionRunner
import phoenix.wallets.WalletsBoundedContext
import phoenix.wallets.infrastructure.akka.AkkaWalletEventStreams
import phoenix.wallets.infrastructure.akka.WalletEventsWebsocketMessageSingleton
import phoenix.websockets.domain.WebsocketMessageOffsetRepository
import phoenix.websockets.infrastructure.SlickPersistenceQueryOffsetRepository

class ProductionLikeEnvironment(
    system: ActorSystem[_],
    keycloakConfig: KeycloakConfig,
    dbConfig: DatabaseConfig[JdbcProfile])(implicit val clock: Clock = Clock.utcClock)
    extends FutureSupport {
  implicit val ec: ExecutionContext = system.executionContext

  val httpClient = new AkkaHttpClient(system.classicSystem)
  val notificationsConfig: NotificationsConfig = NotificationsConfig.of(system)
  val betsConfig: BetsConfig = BetsConfig.of(system)
  val mailer: Mailer = EmailingModule.init(notificationsConfig.email).mailer
  val geolocationValidator: GeolocationValidator = AlwaysValidGeolocationValidator
  val marketBets = new SlickMarketBetsRepository(dbConfig)
  val punterStakes = new SlickPunterStakesRepository(dbConfig)
  val authenticationRepository = new KeycloakAuthenticationRepository(keycloakConfig, httpClient)(system, ec)
  val paymentTransactions = new InMemoryTransactionRepository()
  val cashWithdrawalReservationsRepository = new SlickCashWithdrawalReservationsRepository(dbConfig)
  val notificationsRepository = new SlickPaymentNotificationsRepository(dbConfig)
  val termsAndConditionsRepository = new SlickTermsAndConditionsRepository(dbConfig)
  val excludedPlayersRepository = new InMemoryExcludedPlayersRepository()
  val uuidGenerator: UUIDGenerator = RandomUUIDGenerator
  val noteRepository = new SlickNoteRepository(dbConfig)
  val schedulerModule: SchedulerModule = SchedulerModule.init(clock)(system)
  val walletProjectionRunner = WalletProjectionRunner.build(system, dbConfig)
  val walletsBC: WalletsBoundedContext =
    ActorWalletsBoundedContext(
      system,
      dbConfig,
      BetProjectionRunner.build(system, dbConfig),
      uuidGenerator,
      schedulerModule.akkaJobScheduler,
      walletProjectionRunner)
  val marketsBC: MarketsBoundedContext = ActorMarketsBoundedContext(system, dbConfig)
  val betsBC: BetsBoundedContext =
    ActorBetsBoundedContext(system, marketsBC, marketBets, dbConfig, MarketProjectionRunner.build(system, dbConfig))

  val puntersRepository = new InMemoryPuntersRepository()
  val puntersBC: PuntersBoundedContext =
    ActorPuntersBoundedContext(
      PuntersConfig.of(system),
      system,
      authenticationRepository,
      walletsBC,
      mailer,
      termsAndConditionsRepository,
      excludedPlayersRepository,
      dbConfig,
      clock,
      schedulerModule.akkaJobScheduler,
      uuidGenerator,
      walletProjectionRunner,
      puntersRepository,
      betsBC)

  val backOfficeBC: MarketExposureReadRepository =
    ActorBackofficeBoundedContext(
      system,
      dbConfig,
      BetProjectionRunner.build(system, dbConfig),
      walletProjectionRunner,
      puntersBC,
      walletsBC,
      noteRepository,
      uuidGenerator,
      clock)

  val offsetRepository: WebsocketMessageOffsetRepository = new SlickPersistenceQueryOffsetRepository(dbConfig)

  val marketEventsSingleton = MarketEventsWebsocketSingleton(marketsBC, offsetRepository)(system)
  val marketEventStreams = new AkkaMarketEventStreams(marketEventsSingleton)(system)

  val fixtureEventsSingleton = FixtureEventsWebsocketSingleton(offsetRepository)(system)
  val fixtureEventStreams = new AkkaFixtureEventStreams(fixtureEventsSingleton)(system)

  val betEventsSingleton = BetEventsWebsocketSingleton(offsetRepository)(system)
  val betEventStreams = new AkkaBetEventStreams(betEventsSingleton)(system)

  val walletEventsSingleton = WalletEventsWebsocketMessageSingleton(walletsBC, offsetRepository)(system)
  val walletEventStreams = new AkkaWalletEventStreams(walletEventsSingleton)(system)

  private val auth: JwtAuthenticator = new KeycloakTokenVerifier(keycloakConfig)
  // TODO (PHXD-1641): We should use wiremock here
  val paymentsModule: PaymentsModule =
    PaymentsModule.init(
      puntersBC,
      walletsBC,
      authenticationRepository,
      puntersRepository,
      PaymentsConfig.of(system),
      auth,
      uuidGenerator,
      clock)(
      PaymentsServiceMock.successful(),
      paymentTransactions,
      cashWithdrawalReservationsRepository,
      notificationsRepository)

  val marketScenarios = new MarketScenarios(marketsBC)
  val punterScenarios =
    new PunterScenarios(puntersBC, walletsBC, authenticationRepository, puntersRepository, clock)
  val betScenarios =
    new BetScenarios(
      betsBC,
      walletsBC,
      marketsBC,
      marketBets,
      punterStakes,
      geolocationValidator,
      betsConfig.domain,
      clock)
  val walletScenarios = new WalletScenarios(walletsBC)

  def getCurrentBalance(punter: RandomPunter): DefaultCurrencyMoney =
    awaitRight(walletsBC.currentBalance(punter.walletId)).realMoney.value
}
