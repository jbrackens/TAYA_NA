package phoenix.auditlog.unit

import scala.concurrent.Future

import akka.http.scaladsl.model.StatusCodes
import akka.http.scaladsl.server.Route
import io.circe.Json
import io.circe.parser._

import phoenix.auditlog.domain._
import phoenix.auditlog.infrastructure.http.AuditLogBackofficeRoutes
import phoenix.auditlog.support.InMemoryAuditLogRepository
import phoenix.bets.AlwaysValidGeolocationValidator
import phoenix.bets.infrastructure.http.BetRoutes
import phoenix.bets.support.BetDataGenerator.generateBetsDomainConfig
import phoenix.bets.support.BetsBoundedContextMock
import phoenix.bets.support.TestMarketBetsRepository
import phoenix.bets.support.TestPunterStakeRepository
import phoenix.boundedcontexts.market.MarketBoundedContextMock
import phoenix.boundedcontexts.punter.PuntersContextProviderFailure
import phoenix.boundedcontexts.punter.PuntersContextProviderSuccess
import phoenix.boundedcontexts.wallet.WalletContextProviderFailure
import phoenix.core.emailing.EmailSenderStub
import phoenix.core.emailing.EmailingModule
import phoenix.dbviews.support.InMemoryView01PatronDetailsRepository
import phoenix.geocomply.infrastructure.http.GeoComplyRoutes
import phoenix.geocomply.support.GeoComplyLicenseServiceMock
import phoenix.geocomply.support.GeoComplyServiceMock
import phoenix.http.JsonMarshalling._
import phoenix.http.routes.PhoenixRestRoutes
import phoenix.http.routes.RoutesSpecSupport
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
import phoenix.punters.PunterEntity.PunterId
import phoenix.punters.exclusion.support.InMemoryExcludedPlayersRepository
import phoenix.punters.idcomply.support.IdComplyServiceMock
import phoenix.punters.idcomply.support.InMemoryRegistrationEventRepository
import phoenix.punters.infrastructure.http.PunterRoutes
import phoenix.punters.support._
import phoenix.support.ConstantUUIDGenerator
import phoenix.time.FakeHardcodedClock
import phoenix.wallets.infrastructure.http.WalletRoutes

final class AuditLogBackofficeRoutesSpec extends RoutesSpecSupport {

  implicit val clock = new FakeHardcodedClock()
  implicit val jwtAuthenticator: JwtAuthenticator = JwtAuthenticatorMock.jwtAuthenticatorMock()

  private val auditLogRepository = new InMemoryAuditLogRepository()
  private val auditLogger = new AuditLogger(auditLogRepository, clock)

  private val routes = {
    val wallets = new WalletContextProviderFailure()
    val punters = new PuntersContextProviderFailure()
    val bets = BetsBoundedContextMock.betsWithDomainFailureMock
    val markets = MarketBoundedContextMock.returningMarketNotFound
    val authenticationRepository = new TestAuthenticationRepository()
    val puntersRepository = new InMemoryPuntersRepository()
    val puntersViewRepository = new InMemoryView01PatronDetailsRepository(clock)
    val fakeClock = new FakeHardcodedClock()
    val registrationEventRepository = new InMemoryRegistrationEventRepository()
    val limitsHistoryRepository = new InMemoryPunterLimitsHistoryRepository()
    val coolOffsHistoryRepository = new InMemoryPunterCoolOffsHistoryRepository()
    val idComplyService = IdComplyServiceMock.failing()
    val noteRepository = new InMemoryNoteRepository()
    val excludedPlayersRepository = new InMemoryExcludedPlayersRepository()
    val uuidGenerator = ConstantUUIDGenerator
    val noteModule =
      NoteModule.init(puntersRepository, new NoteProjectionsSupport().projections, noteRepository, uuidGenerator, clock)
    val emailingModule = EmailingModule.init(new EmailSenderStub())
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
    new PhoenixRestRoutes(
      new BetRoutes(
        BetsBoundedContextMock.betsWithDomainFailureMock,
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
        bets,
        authenticationRepository,
        puntersRepository,
        puntersViewRepository,
        new TermsAndConditionsRepositoryMock(),
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
        new AuditLogBackofficeRoutes(BackofficeRoutes.adminMountPoint, auditLogger),
        new NoteBackofficeRoutes(
          BackofficeRoutes.adminMountPoint,
          new InMemoryNoteRepository(),
          puntersRepository,
          uuidGenerator,
          clock),
        new TermsAndConditionsRepositoryMock(),
        _ => Future.successful(()),
        excludedPlayersRepository,
        registrationEventRepository,
        new EmptyReportsModule()))
  }

  implicit val underTest = Route.seal(routes.toAkkaHttp)

  private val expectedLogEntries = {
    val now = clock.currentOffsetDateTime()
    List(
      AccountCreationEntry(PunterId("293524d2-9df3-4bbd-bc55-52abe4232dd4"), now),
      AccountClosureEntry(PunterId("805f0cce-4180-4326-9b34-b00d87ad0518"), now.plusSeconds(1)),
      AccountCreationEntry(PunterId("bea9dafc-f89e-488b-b91a-dabc7b9ce325"), now.plusSeconds(4)),
      AccountClosureEntry(PunterId("eac15c3e-2b64-4743-8818-216ff6babe13"), now.plusSeconds(5)))
  }

  private val expectedAuditLogJson =
    """
      |{
      |  "currentPage": 1,
      |  "data": [{
      |    "category": "ACCOUNT_CREATION",
      |    "createdAt": "2021-01-18T12:51:33Z",
      |    "punterId": "eac15c3e-2b64-4743-8818-216ff6babe13",
      |    "type": "accountClosure"
      |  }, {
      |    "category": "ACCOUNT_CREATION",
      |    "createdAt": "2021-01-18T12:51:32Z",
      |    "punterId": "bea9dafc-f89e-488b-b91a-dabc7b9ce325",
      |    "type": "accountCreation"
      |  }, {
      |    "category": "ACCOUNT_CREATION",
      |    "createdAt": "2021-01-18T12:51:29Z",
      |    "punterId": "805f0cce-4180-4326-9b34-b00d87ad0518",
      |    "type": "accountClosure"
      |  }, {
      |    "category": "ACCOUNT_CREATION",
      |    "createdAt": "2021-01-18T12:51:28Z",
      |    "punterId": "293524d2-9df3-4bbd-bc55-52abe4232dd4",
      |    "type": "accountCreation"
      |  }],
      |  "hasNextPage": false,
      |  "itemsPerPage": 20,
      |  "totalCount": 4
      |}
      |""".stripMargin

  private def seedDefaultEntries(): Unit =
    auditLogRepository.entries = expectedLogEntries

  "Backoffice audit log routes" when {
    "GET /admin/audit-logs" should {

      assertAdminRoleRequired(Get("/admin/audit-logs"))

      "returns 200 OK" in {
        seedDefaultEntries()
        withAdminToken(Get("/admin/audit-logs")) ~> underTest ~> check {
          status shouldEqual StatusCodes.OK
          Right(responseAs[Json]) shouldBe parse(expectedAuditLogJson)
        }
      }

      "supports filtering by product and targetId for prediction lifecycle entries" in {
        val now = clock.currentOffsetDateTime().plusSeconds(10)
        auditLogRepository.entries =
          expectedLogEntries ++ List(
            PredictionMarketLifecycleEntry(
              action = "prediction.market.resolved",
              actorId = "admin-risk-1",
              targetId = "pm-btc-120k-2026",
              product = "prediction",
              details = "Resolved at close",
              occurredAt = now.plusSeconds(5),
              dataBefore = Map("status" -> "open"),
              dataAfter = Map("status" -> "resolved"),
              createdAt = now.plusSeconds(5)),
            PredictionMarketLifecycleEntry(
              action = "prediction.market.suspended",
              actorId = "trader-2",
              targetId = "pm-fed-cut-jul-2026",
              product = "prediction",
              details = "Review",
              occurredAt = now,
              dataBefore = Map("status" -> "live"),
              dataAfter = Map("status" -> "suspended"),
              createdAt = now))

        withAdminToken(
          Get("/admin/audit-logs?product=prediction&targetId=pm-btc-120k-2026&sortBy=occurredAt&sortDir=desc")) ~> underTest ~> check {
          status shouldEqual StatusCodes.OK
          val json = responseAs[Json]
          json.hcursor.downField("totalCount").as[Int] shouldBe Right(1)
          json.hcursor.downField("data").downArray.downField("product").as[String] shouldBe Right("prediction")
          json.hcursor.downField("data").downArray.downField("targetId").as[String] shouldBe Right("pm-btc-120k-2026")
          json.hcursor.downField("data").downArray.downField("action").as[String] shouldBe Right("prediction.market.resolved")
        }
      }

      "keeps prediction-scoped audit pivots trader or admin only" in {
        auditLogRepository.entries =
          List(
            PredictionMarketLifecycleEntry(
              action = "prediction.market.suspended",
              actorId = "operator-1",
              targetId = "pm-fed-cut-jul-2026",
              product = "prediction",
              details = "risk review",
              occurredAt = clock.currentOffsetDateTime(),
              dataBefore = Map("status" -> "open"),
              dataAfter = Map("status" -> "suspended"),
              createdAt = clock.currentOffsetDateTime()))

        withAuthToken(Get("/admin/audit-logs?product=prediction"), JwtAuthenticatorMock.operatorToken) ~> underTest ~> check {
          status shouldEqual StatusCodes.Forbidden
          assertErrorResponse(responseAs[Json], "userMissingPredictionOpsRole")
        }

        withAuthToken(Get("/admin/audit-logs?product=prediction"), JwtAuthenticatorMock.traderToken) ~> underTest ~> check {
          status shouldEqual StatusCodes.OK
          val json = responseAs[Json]
          json.hcursor.downField("totalCount").as[Int] shouldBe Right(1)
          json.hcursor.downField("data").downArray.downField("product").as[String] shouldBe Right("prediction")
        }
      }

      "keeps non-prediction audit views admin only" in {
        withAuthToken(Get("/admin/audit-logs"), JwtAuthenticatorMock.operatorToken) ~> underTest ~> check {
          status shouldEqual StatusCodes.Forbidden
          assertErrorResponse(responseAs[Json], "userMissingAdminRole")
        }
      }
    }
  }
}
