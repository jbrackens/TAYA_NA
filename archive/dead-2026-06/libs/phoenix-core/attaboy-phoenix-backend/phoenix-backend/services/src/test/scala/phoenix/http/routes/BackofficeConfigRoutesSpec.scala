package phoenix.http.routes

import scala.concurrent.Future

import akka.http.scaladsl.model.StatusCodes
import akka.http.scaladsl.server.Route
import org.scalamock.scalatest.MockFactory

import phoenix.auditlog.domain.AuditLogger
import phoenix.auditlog.infrastructure.http.AuditLogBackofficeRoutes
import phoenix.auditlog.support.InMemoryAuditLogRepository
import phoenix.bets.AlwaysValidGeolocationValidator
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
import phoenix.dbviews.support.InMemoryView01PatronDetailsRepository
import phoenix.geocomply.infrastructure.http.GeoComplyRoutes
import phoenix.geocomply.support.GeoComplyLicenseServiceMock
import phoenix.geocomply.support.GeoComplyServiceMock
import phoenix.http.routes.backoffice.BackofficeRoutes
import phoenix.jwt.JwtAuthenticator
import phoenix.jwt.JwtAuthenticatorMock
import phoenix.markets.infrastructure.http.MarketRoutes
import phoenix.notes.NoteModule
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
import phoenix.punters.exclusion.support.InMemoryExcludedPlayersRepository
import phoenix.punters.idcomply.support.IdComplyServiceMock
import phoenix.punters.idcomply.support.InMemoryRegistrationEventRepository
import phoenix.punters.infrastructure.http.BackofficePunterRoutesSpec.PunterBetHistoryReturned
import phoenix.punters.infrastructure.http.PunterRoutes
import phoenix.punters.support._
import phoenix.support.ConstantUUIDGenerator
import phoenix.time.FakeHardcodedClock
import phoenix.wallets.WalletsBoundedContext
import phoenix.wallets.infrastructure.http.WalletRoutes

final class BackofficeConfigRoutesSpec extends RoutesSpecSupport with MockFactory {

  implicit val clock: Clock = new FakeHardcodedClock()
  implicit val jwtAuthenticator: JwtAuthenticator = JwtAuthenticatorMock.jwtAuthenticatorMock()

  "POST /admin/upload-terms" should {
    val validTerms = s"""{"currentTermsVersion": 1, "termsContent":"termsContent", "termsDaysThreshold":100}"""

    val validTermsWithDefault = s"""{"currentTermsVersion": 1, "termsContent":"termsContent"}"""

    assertAdminRoleRequired(Post("/admin/upload-terms", validTerms))(buildRoutes())

    "returns 200 OK" in {
      withAdminToken(Post("/admin/upload-terms", validTerms)) ~> buildRoutes() ~> check {
        status shouldEqual StatusCodes.OK
      }
    }

    "returns 200 OK with default terms days threshold" in {
      withAdminToken(Post("/admin/upload-terms", validTermsWithDefault)) ~> buildRoutes() ~> check {
        status shouldEqual StatusCodes.OK
      }
    }

  }

  def buildRoutes(
      punters: PuntersBoundedContext = new PuntersContextProviderSuccess(),
      wallets: WalletsBoundedContext = new WalletContextProviderSuccess(clock)): Route = {
    val markets = MarketBoundedContextMock.returningAllMarkets
    val bets = BetsBoundedContextMock.betsWithDomainFailureMock
    val authenticationRepository = new TestAuthenticationRepository()
    val puntersRepository = new InMemoryPuntersRepository()
    val puntersViewRepository = new InMemoryView01PatronDetailsRepository(clock)
    val uuidGenerator = ConstantUUIDGenerator
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
        PaymentsServiceMock.failing(),
        new InMemoryTransactionRepository(),
        new InMemoryCashWithdrawalReservationsRepository(),
        new InMemoryPaymentNotificationsRepository())
    val termsAndConditionsRepository = new TermsAndConditionsRepositoryMock()
    val registrationEventRepository = new InMemoryRegistrationEventRepository()
    val limitsHistoryRepository = new InMemoryPunterLimitsHistoryRepository()
    val coolOffsHistoryRepository = new InMemoryPunterCoolOffsHistoryRepository()
    val idComplyService = IdComplyServiceMock.apply()
    val noteRepository = new InMemoryNoteRepository()
    val noteModule =
      NoteModule.init(puntersRepository, new NoteProjectionsSupport().projections, noteRepository, uuidGenerator, clock)
    val excludedPlayersRepository = new InMemoryExcludedPlayersRepository()
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
        generateBetsDomainConfig()),
      new MarketRoutes(markets),
      new WalletRoutes(wallets),
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
        limitsHistoryRepository,
        new InMemoryPunterDeviceFingerprintsRepository(clock)(),
        coolOffsHistoryRepository,
        idComplyService,
        excludedPlayersRepository,
        emailingModule.mailer,
        noteModule.noteRepository,
        uuidGenerator,
        clock,
        generatePuntersDomainConfig()),
      new GeoComplyRoutes(GeoComplyServiceMock.failing(), GeoComplyLicenseServiceMock.failing()),
      paymentsModule.routes.payments,
      new BackofficeRoutes(
        _,
        BetsBoundedContextMock.betsSearchMock(PunterBetHistoryReturned),
        markets,
        punters,
        wallets,
        new TestAuthenticationRepository(),
        puntersRepository,
        puntersViewRepository,
        limitsHistoryRepository,
        coolOffsHistoryRepository,
        new AuditLogBackofficeRoutes(
          BackofficeRoutes.adminMountPoint,
          new AuditLogger(new InMemoryAuditLogRepository(), clock)),
        new NoteBackofficeRoutes(
          BackofficeRoutes.adminMountPoint,
          new InMemoryNoteRepository(),
          puntersRepository,
          uuidGenerator,
          clock),
        termsAndConditionsRepository,
        _ => Future.successful(()),
        excludedPlayersRepository,
        registrationEventRepository,
        new EmptyReportsModule()))

    Route.seal(routes.toAkkaHttp)
  }

}
