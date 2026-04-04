package phoenix.http.support

import scala.concurrent.Future

import akka.actor.typed.ActorSystem
import akka.http.scaladsl.server.Route

import phoenix.auditlog.domain.AuditLogger
import phoenix.auditlog.infrastructure.http.AuditLogBackofficeRoutes
import phoenix.auditlog.support.InMemoryAuditLogRepository
import phoenix.bets.AlwaysValidGeolocationValidator
import phoenix.bets.BetState
import phoenix.bets.BetsBoundedContext
import phoenix.bets.BetsDomainConfig
import phoenix.bets.infrastructure.http.BetRoutes
import phoenix.bets.support.BetDataGenerator.generateBetsDomainConfig
import phoenix.bets.support.BetsBoundedContextMock
import phoenix.bets.support.TestMarketBetsRepository
import phoenix.bets.support.TestPunterStakeRepository
import phoenix.boundedcontexts.market.MarketBoundedContextMock
import phoenix.boundedcontexts.punter.PuntersContextProviderSuccess
import phoenix.boundedcontexts.wallet.WalletContextProviderSuccess
import phoenix.core.Clock
import phoenix.core.emailing.EmailSenderStub
import phoenix.core.emailing.EmailingModule
import phoenix.dbviews.infrastructure.View01PatronDetailsRepository
import phoenix.dbviews.support.InMemoryView01PatronDetailsRepository
import phoenix.geocomply.infrastructure.http.GeoComplyRoutes
import phoenix.geocomply.support.GeoComplyLicenseServiceMock
import phoenix.geocomply.support.GeoComplyServiceMock
import phoenix.http.routes.PhoenixRestRoutes
import phoenix.http.routes.backoffice.BackofficeRoutes
import phoenix.jwt.JwtAuthenticator
import phoenix.markets.infrastructure.http.MarketRoutes
import phoenix.notes.NoteModule
import phoenix.notes.domain.NoteRepository
import phoenix.notes.infrastructure.http.NoteBackofficeRoutes
import phoenix.notes.support.InMemoryNoteRepository
import phoenix.notes.support.NoteProjectionsSupport
import phoenix.payments.PaymentsModule
import phoenix.payments.infrastructure.InMemoryPaymentNotificationsRepository
import phoenix.payments.infrastructure.InMemoryTransactionRepository
import phoenix.payments.support.InMemoryCashWithdrawalReservationsRepository
import phoenix.payments.support.PaymentsDataGenerator.generatePaymentsConfig
import phoenix.payments.support.PaymentsServiceMock
import phoenix.punters.PunterDataGenerator.generatePuntersDomainConfig
import phoenix.punters.PuntersBoundedContext
import phoenix.punters.PuntersDomainConfig
import phoenix.punters.domain.PunterCoolOffsHistoryRepository
import phoenix.punters.domain.PunterLimitsHistoryRepository
import phoenix.punters.domain.PuntersRepository
import phoenix.punters.domain.TermsAndConditionsRepository
import phoenix.punters.exclusion.support.InMemoryExcludedPlayersRepository
import phoenix.punters.idcomply.support.IdComplyServiceMock
import phoenix.punters.idcomply.support.InMemoryRegistrationEventRepository
import phoenix.punters.infrastructure.http.BackofficePunterRoutesSpec.betData
import phoenix.punters.infrastructure.http.PunterRoutes
import phoenix.punters.support.AccountVerificationCodeRepositoryStub
import phoenix.punters.support.EmptyReportsModule
import phoenix.punters.support.InMemoryPunterCoolOffsHistoryRepository
import phoenix.punters.support.InMemoryPunterDeviceFingerprintsRepository
import phoenix.punters.support.InMemoryPunterLimitsHistoryRepository
import phoenix.punters.support.InMemoryPuntersRepository
import phoenix.punters.support.TermsAndConditionsRepositoryMock
import phoenix.punters.support.TestAuthenticationRepository
import phoenix.punters.support.TestMultiFactorAuthenticationService
import phoenix.utils.RandomUUIDGenerator
import phoenix.utils.UUIDGenerator
import phoenix.wallets.WalletsBoundedContext
import phoenix.wallets.infrastructure.http.WalletRoutes

final class PhoenixRestRoutesBuilder(clock: Clock, jwtAuthenticator: JwtAuthenticator)(implicit
    system: ActorSystem[_]) {
  implicit val ec = system.executionContext
  implicit val c = clock

  def buildRoutes(
      punters: PuntersBoundedContext = new PuntersContextProviderSuccess()(clock),
      wallets: WalletsBoundedContext = new WalletContextProviderSuccess(clock),
      bets: BetsBoundedContext = BetsBoundedContextMock.betsSuccessMock(BetState.Status.Open, betData),
      authenticationRepository: TestAuthenticationRepository = new TestAuthenticationRepository(),
      puntersRepository: PuntersRepository = new InMemoryPuntersRepository(),
      puntersViewRepository: View01PatronDetailsRepository = new InMemoryView01PatronDetailsRepository(clock),
      punterLimitsHistoryRepository: PunterLimitsHistoryRepository = new InMemoryPunterLimitsHistoryRepository(),
      punterCoolOffsHistoryRepository: PunterCoolOffsHistoryRepository = new InMemoryPunterCoolOffsHistoryRepository(),
      termsAndConditionsRepository: TermsAndConditionsRepository = new TermsAndConditionsRepositoryMock(),
      noteRepository: NoteRepository = new InMemoryNoteRepository(),
      uuidGenerator: UUIDGenerator = RandomUUIDGenerator,
      puntersDomainConfig: PuntersDomainConfig = generatePuntersDomainConfig(),
      betsDomainConfig: BetsDomainConfig = generateBetsDomainConfig(),
      excludedPlayersRepository: InMemoryExcludedPlayersRepository = new InMemoryExcludedPlayersRepository()): Route = {

    val markets = MarketBoundedContextMock.returningAllMarkets(clock)
    val paymentsModule =
      PaymentsModule.init(
        punters,
        wallets,
        authenticationRepository,
        puntersRepository,
        generatePaymentsConfig(),
        jwtAuthenticator,
        uuidGenerator,
        clock)(
        PaymentsServiceMock.successful(),
        new InMemoryTransactionRepository(),
        new InMemoryCashWithdrawalReservationsRepository(),
        new InMemoryPaymentNotificationsRepository())

    val registrationEventRepository = new InMemoryRegistrationEventRepository()
    val idComplyService = IdComplyServiceMock.apply()
    val noteModule =
      NoteModule.init(
        puntersRepository,
        new NoteProjectionsSupport().projections,
        noteRepository,
        uuidGenerator,
        clock)(ec, jwtAuthenticator)
    val emailingModule = EmailingModule.init(new EmailSenderStub())

    val routes = new PhoenixRestRoutes(
      new BetRoutes(
        bets,
        wallets,
        markets,
        punters,
        new TestMarketBetsRepository(),
        new TestPunterStakeRepository,
        AlwaysValidGeolocationValidator,
        betsDomainConfig)(jwtAuthenticator, ec, clock),
      new MarketRoutes(markets),
      new WalletRoutes(wallets)(jwtAuthenticator, clock, ec),
      new PunterRoutes(
        punters,
        wallets,
        bets,
        authenticationRepository,
        puntersRepository,
        puntersViewRepository,
        termsAndConditionsRepository,
        new TestMultiFactorAuthenticationService(),
        new AccountVerificationCodeRepositoryStub(clock)(),
        registrationEventRepository,
        punterLimitsHistoryRepository,
        new InMemoryPunterDeviceFingerprintsRepository(clock)(),
        punterCoolOffsHistoryRepository,
        idComplyService,
        excludedPlayersRepository,
        emailingModule.mailer,
        noteModule.noteRepository,
        uuidGenerator,
        clock,
        puntersDomainConfig)(jwtAuthenticator, ec),
      new GeoComplyRoutes(GeoComplyServiceMock.failing(), GeoComplyLicenseServiceMock.failing()),
      paymentsModule.routes.payments,
      new BackofficeRoutes(
        _,
        bets,
        markets,
        punters,
        wallets,
        authenticationRepository,
        puntersRepository,
        puntersViewRepository,
        punterLimitsHistoryRepository,
        punterCoolOffsHistoryRepository,
        new AuditLogBackofficeRoutes(
          BackofficeRoutes.adminMountPoint,
          new AuditLogger(new InMemoryAuditLogRepository(), clock))(jwtAuthenticator, ec),
        new NoteBackofficeRoutes(
          BackofficeRoutes.adminMountPoint,
          noteRepository,
          puntersRepository,
          uuidGenerator,
          clock)(jwtAuthenticator, ec),
        termsAndConditionsRepository,
        _ => Future.successful(()),
        excludedPlayersRepository,
        registrationEventRepository,
        new EmptyReportsModule)(jwtAuthenticator, system, clock))

    Route.seal(routes.toAkkaHttp)
  }
}
