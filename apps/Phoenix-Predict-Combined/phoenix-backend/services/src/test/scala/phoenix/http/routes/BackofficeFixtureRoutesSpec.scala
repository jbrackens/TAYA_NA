package phoenix.http.routes

import scala.concurrent.Future
import scala.concurrent.duration._

import akka.http.scaladsl.model.StatusCodes
import akka.http.scaladsl.server.Route
import akka.http.scaladsl.testkit.RouteTestTimeout
import io.circe.Json
import io.circe.parser._

import phoenix.auditlog.domain.AuditLogger
import phoenix.auditlog.infrastructure.http.AuditLogBackofficeRoutes
import phoenix.auditlog.support.InMemoryAuditLogRepository
import phoenix.bets.AlwaysValidGeolocationValidator
import phoenix.bets.BetState
import phoenix.bets.infrastructure.http.BetRoutes
import phoenix.bets.support.BetDataGenerator.generateBetsDomainConfig
import phoenix.bets.support.BetsBoundedContextMock
import phoenix.bets.support.TestMarketBetsRepository
import phoenix.bets.support.TestPunterStakeRepository
import phoenix.boundedcontexts.market.MarketBoundedContextMock
import phoenix.boundedcontexts.market.MarketBoundedContextMock.TradingFixtureResponse
import phoenix.boundedcontexts.punter.PuntersContextProviderSuccess
import phoenix.boundedcontexts.wallet.WalletContextProviderSuccess
import phoenix.core.Clock
import phoenix.core.emailing.EmailSenderStub
import phoenix.core.emailing.EmailingModule
import phoenix.core.pagination.PaginatedResult
import phoenix.core.pagination.Pagination
import phoenix.dbviews.support.InMemoryView01PatronDetailsRepository
import phoenix.geocomply.infrastructure.http.GeoComplyRoutes
import phoenix.geocomply.support.GeoComplyLicenseServiceMock
import phoenix.geocomply.support.GeoComplyServiceMock
import phoenix.http.JsonMarshalling._
import phoenix.http.routes.backoffice.BackofficeRoutes
import phoenix.jwt.JwtAuthenticator
import phoenix.jwt.JwtAuthenticatorMock
import phoenix.markets.MarketsBoundedContext.MarketSettlingRequest
import phoenix.markets.infrastructure.MarketJsonFormats._
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
import phoenix.punters.PunterEntity.PunterId
import phoenix.punters.exclusion.support.InMemoryExcludedPlayersRepository
import phoenix.punters.idcomply.support.IdComplyServiceMock
import phoenix.punters.idcomply.support.InMemoryRegistrationEventRepository
import phoenix.punters.infrastructure.http.PunterRoutes
import phoenix.punters.support._
import phoenix.support.ConstantUUIDGenerator
import phoenix.support.DataGenerator.generateBetData
import phoenix.time.FakeHardcodedClock
import phoenix.wallets.infrastructure.http.WalletRoutes

final class BackofficeFixtureRoutesSpec extends RoutesSpecSupport {

  implicit val clock: Clock = Clock.utcClock
  implicit val jwtAuthenticator: JwtAuthenticator = JwtAuthenticatorMock.jwtAuthenticatorMock()

  // The default is 1 second, which is apparently too low in our CI :/
  implicit val routeTestTimeout: RouteTestTimeout = RouteTestTimeout(5.seconds)

  private val returningTradingFixtures = MarketBoundedContextMock.apply(
    listTradingFixturesFn =
      (_, _, _) => Future.successful(PaginatedResult(Seq(TradingFixtureResponse.response), 1, Pagination(1, 10))),
    getTradingFixtureFn = _ => Future.successful(Right(TradingFixtureResponse.response)),
    updateFixtureInfoFn = (_, _, _) => Future.successful(Right(())))

  val ThePunterId = PunterId("69790b82-6c65-4ed9-91eb-b4ba0b8542a8")

  private val routes = {
    val wallets = new WalletContextProviderSuccess(clock)
    val punters = new PuntersContextProviderSuccess()
    val termsAndConditionsRepository = new TermsAndConditionsRepositoryMock()
    val excludedPlayersRepository = new InMemoryExcludedPlayersRepository()
    val markets = returningTradingFixtures
    val authenticationRepository = new TestAuthenticationRepository()
    val uuidGenerator = ConstantUUIDGenerator
    val puntersRepository = new InMemoryPuntersRepository()
    val puntersViewRepository = new InMemoryView01PatronDetailsRepository(clock)
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
    val limitsHistoryRepository = new InMemoryPunterLimitsHistoryRepository()
    val coolOffsHistoryRepository = new InMemoryPunterCoolOffsHistoryRepository()
    val idComplyService = IdComplyServiceMock.apply()
    val noteRepository = new InMemoryNoteRepository()
    val noteModule =
      NoteModule.init(puntersRepository, new NoteProjectionsSupport().projections, noteRepository, uuidGenerator, clock)
    val emailingModule = EmailingModule.init(new EmailSenderStub())
    val fakeClock = new FakeHardcodedClock()
    new PhoenixRestRoutes(
      new BetRoutes(
        BetsBoundedContextMock.betsSuccessMock(BetState.Status.Open, generateBetData().copy(punterId = ThePunterId)),
        wallets,
        markets,
        punters,
        new TestMarketBetsRepository(),
        new TestPunterStakeRepository(),
        AlwaysValidGeolocationValidator,
        generateBetsDomainConfig()),
      new MarketRoutes(MarketBoundedContextMock.returningAllMarkets),
      new WalletRoutes(wallets),
      new PunterRoutes(
        punters,
        wallets,
        BetsBoundedContextMock.betsSuccessMock(BetState.Status.Open, generateBetData().copy(punterId = ThePunterId)),
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
        new InMemoryExcludedPlayersRepository(),
        emailingModule.mailer,
        noteModule.noteRepository,
        uuidGenerator,
        fakeClock,
        generatePuntersDomainConfig()),
      new GeoComplyRoutes(GeoComplyServiceMock.failing(), GeoComplyLicenseServiceMock.failing()),
      paymentsModule.routes.payments,
      new BackofficeRoutes(
        _,
        BetsBoundedContextMock.betsWithDomainFailureMock,
        markets,
        new PuntersContextProviderSuccess(),
        wallets,
        new TestAuthenticationRepository(),
        puntersRepository,
        puntersViewRepository,
        limitsHistoryRepository,
        coolOffsHistoryRepository,
        new AuditLogBackofficeRoutes(
          BackofficeRoutes.adminMountPoint,
          new AuditLogger(new InMemoryAuditLogRepository(), fakeClock)),
        new NoteBackofficeRoutes(
          BackofficeRoutes.adminMountPoint,
          new InMemoryNoteRepository(),
          puntersRepository,
          uuidGenerator,
          fakeClock),
        termsAndConditionsRepository,
        _ => Future.successful(()),
        excludedPlayersRepository,
        registrationEventRepository,
        new EmptyReportsModule()))
  }

  implicit val underTest = Route.seal(routes.toAkkaHttp)

  "Backoffice fixture routes" when {
    "GET /admin/trading/fixtures" should {
      assertAdminRoleRequired(Get("/admin/trading/fixtures"))

      "returns 200 OK" in {
        withAdminToken(Get("/admin/trading/fixtures")) ~> underTest ~> check {
          status shouldEqual StatusCodes.OK
          Right(responseAs[Json]) shouldBe parse(TradingFixtureResponse.responseListJson)
        }
      }
    }

    "GET /admin/trading/fixtures/:fixtureId" should {
      assertAdminRoleRequired(Get("/admin/trading/fixtures/f:o:fixture123"))

      "returns 200 OK" in {
        withAdminToken(Get("/admin/trading/fixtures/f:o:fixture123")) ~> underTest ~> check {
          status shouldEqual StatusCodes.OK
          Right(responseAs[Json]) shouldBe parse(TradingFixtureResponse.responseJson)
        }
      }
    }

    "POST /admin/trading/sports/s:p:sport123/fixtures/f:o:fixture123" should {
      assertAdminRoleRequired(
        Post("/admin/trading/sports/s:p:sport123/fixtures/f:o:fixture123", MarketSettlingRequest("selection1")))

      "return 204 NoContent" in {
        withAdminToken(
          Post(
            "/admin/trading/sports/s:p:sport123/fixtures/f:o:fixture123",
            MarketSettlingRequest("selection1"))) ~> underTest ~> check {
          status shouldEqual StatusCodes.NoContent
        }
      }
    }
  }
}
