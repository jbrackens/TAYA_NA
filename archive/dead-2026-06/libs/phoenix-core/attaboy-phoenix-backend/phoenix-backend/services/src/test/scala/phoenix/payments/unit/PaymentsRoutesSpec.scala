package phoenix.payments.unit

import java.util.UUID

import scala.concurrent.ExecutionContext
import scala.concurrent.Future
import scala.math.Ordered.orderingToOrdered

import akka.http.scaladsl.model.StatusCodes
import akka.http.scaladsl.model.headers.Authorization
import akka.http.scaladsl.model.headers.OAuth2BearerToken
import akka.http.scaladsl.server.Route
import cats.data.EitherT
import cats.data.OptionT
import io.circe.Json

import phoenix.boundedcontexts.punter.PuntersContextProviderFailure
import phoenix.boundedcontexts.punter.PuntersContextProviderSuccess
import phoenix.boundedcontexts.punter.PuntersContextProviderSuccess.exampleCoolingOffPunterProfile
import phoenix.boundedcontexts.punter.PuntersContextProviderSuccess.exampleDeletedPunterProfile
import phoenix.boundedcontexts.punter.PuntersContextProviderSuccess.exampleSuspendedPunterProfile
import phoenix.boundedcontexts.wallet.WalletContextProviderFailure
import phoenix.boundedcontexts.wallet.WalletContextProviderSuccess
import phoenix.core.Clock
import phoenix.core.EitherTUtils._
import phoenix.core.currency.DefaultCurrencyMoney
import phoenix.core.currency.MoneyAmount
import phoenix.core.currency.PositiveAmount
import phoenix.http.JsonMarshalling._
import phoenix.http.routes.RoutesSpecSupport
import phoenix.jwt.JwtAuthenticatorMock
import phoenix.jwt.JwtAuthenticatorMock.punterToken
import phoenix.payments.PaymentsModule
import phoenix.payments.domain.PaymentDirection
import phoenix.payments.domain.PaymentTransaction
import phoenix.payments.domain.PaymentsService
import phoenix.payments.domain.TransactionId
import phoenix.payments.domain.TransactionRepository
import phoenix.payments.domain.TransactionStatus
import phoenix.payments.infrastructure.InMemoryPaymentNotificationsRepository
import phoenix.payments.infrastructure.InMemoryTransactionRepository
import phoenix.payments.infrastructure.http.PaymentsJsonFormats._
import phoenix.payments.infrastructure.http.PaymentsTapirEndpoints.PaymentRequest
import phoenix.payments.support.InMemoryCashWithdrawalReservationsRepository
import phoenix.payments.support.PaymentsDataGenerator.generatePaymentRequest
import phoenix.payments.support.PaymentsDataGenerator.generatePaymentsConfig
import phoenix.payments.support.PaymentsDataGenerator.generateStartedPaymentSession
import phoenix.payments.support.PaymentsServiceMock
import phoenix.punters.PunterDataGenerator.Api
import phoenix.punters.PunterDataGenerator.Api.generatePunterId
import phoenix.punters.PunterDataGenerator.generateRegisteredUser
import phoenix.punters.PunterEntity.PunterId
import phoenix.punters.PuntersBoundedContext
import phoenix.punters.PuntersBoundedContext.SessionId
import phoenix.punters.domain.AuthenticationRepository
import phoenix.punters.domain.AuthenticationRepository.UserLookupId
import phoenix.punters.domain.Punter
import phoenix.punters.domain.PunterProfile
import phoenix.punters.domain.PunterStatus
import phoenix.punters.domain.PuntersRepository
import phoenix.punters.domain.RegisteredUserKeycloak
import phoenix.punters.domain.StartedSession
import phoenix.punters.support.InMemoryPuntersRepository
import phoenix.punters.support.MemorizingTestAuthenticationRepository
import phoenix.punters.support.PunterConverters.RegisteredUserOps
import phoenix.support.UnsafeValueObjectExtensions._
import phoenix.utils.RandomUUIDGenerator
import phoenix.wallets.WalletsBoundedContext
import phoenix.wallets.WalletsBoundedContextProtocol
import phoenix.wallets.WalletsBoundedContextProtocol.Balance
import phoenix.wallets.WalletsBoundedContextProtocol.InsufficientFundsError
import phoenix.wallets.WalletsBoundedContextProtocol.ReservationError
import phoenix.wallets.WalletsBoundedContextProtocol.ReservationId
import phoenix.wallets.WalletsBoundedContextProtocol.WalletFundsReserved
import phoenix.wallets.WalletsBoundedContextProtocol.WalletId
import phoenix.wallets.WalletsBoundedContextProtocol.WalletNotFoundError
import phoenix.wallets.WalletsBoundedContextProtocol.WithdrawalReservation
import phoenix.wallets.domain.Funds.RealMoney
import phoenix.wallets.support.WalletsDataGenerator

final class PaymentsRoutesSpec extends RoutesSpecSupport {

  private implicit val clock = Clock.utcClock
  private implicit val jwtAuthenticator = JwtAuthenticatorMock.jwtAuthenticatorMock()
  private val authHeader = Authorization(OAuth2BearerToken(punterToken.rawValue))
  implicit val ec = typedSystem.executionContext
  private val validOnlineMinDeposit = DefaultCurrencyMoney(1)
  private val validOnlineMinWithdrawal = DefaultCurrencyMoney(1)
  private val validCashMinWithdrawal = DefaultCurrencyMoney(50)
  private val invalidCashMinWithdrawal = DefaultCurrencyMoney(49)

  "PaymentsRoutes" when {

    "creating a new deposit" should {

      "return 200 OK with valid redirect data if punter is active" in {
        val routesUnderTest = buildRoutes()

        Post("/payments/deposit", makePaymentRequest(validOnlineMinDeposit)) ~> authHeader ~> routesUnderTest ~> check {
          status shouldEqual StatusCodes.OK

          jsonFieldDecoded[String]("redirectUrl") shouldBe defined
          jsonFieldDecoded[String]("paymentReference") shouldBe defined
        }
      }

      "return 403 Forbidden with correct error code if punter is suspended" in {
        val routesUnderTest = buildRoutes(punters = new PuntersContextProviderSuccess(exampleSuspendedPunterProfile))

        Post("/payments/deposit", makePaymentRequest(validOnlineMinDeposit)) ~> authHeader ~> routesUnderTest ~> check {
          status shouldEqual StatusCodes.Forbidden
          assertErrorResponse(responseAs[Json], "punterIsSuspended")
        }
      }

      "return 403 Forbidden with correct error code if punter is cooling off" in {
        val routesUnderTest = buildRoutes(punters = new PuntersContextProviderSuccess(exampleCoolingOffPunterProfile))

        Post("/payments/deposit", makePaymentRequest(validOnlineMinDeposit)) ~> authHeader ~> routesUnderTest ~> check {
          status shouldEqual StatusCodes.Forbidden
          assertErrorResponse(responseAs[Json], "punterIsInCoolOff")
        }
      }

      "return 403 Forbidden with correct error code if punter is deleted" in {
        val routesUnderTest = buildRoutes(punters = new PuntersContextProviderSuccess(exampleDeletedPunterProfile))

        Post("/payments/deposit", makePaymentRequest(validOnlineMinDeposit)) ~> authHeader ~> routesUnderTest ~> check {
          status shouldEqual StatusCodes.Forbidden
          assertErrorResponse(responseAs[Json], "punterIsDeleted")
        }
      }

      "return 403 Forbidden with correct error code if punter doesn't exist" in {
        val routesUnderTest = buildRoutes(punters = new PuntersContextProviderFailure())

        Post("/payments/deposit", generatePaymentRequest()) ~> authHeader ~> routesUnderTest ~> check {
          status shouldEqual StatusCodes.Forbidden
          assertErrorResponse(responseAs[Json], "punterProfileDoesNotExist")
        }
      }

      "return 404 NotFound with correct error code if wallet doesn't exist" in {
        val routesUnderTest = buildRoutes(wallets = new WalletContextProviderFailure)

        Post("/payments/deposit", generatePaymentRequest()) ~> authHeader ~> routesUnderTest ~> check {
          status shouldEqual StatusCodes.NotFound
          assertErrorResponse(responseAs[Json], "walletNotFound")
        }
      }

      "return 500 InternalServerError with correct error code if payments service fails" in {
        val routesUnderTest = buildRoutes(payments = PaymentsServiceMock.failing())

        Post("/payments/deposit", makePaymentRequest(validOnlineMinDeposit)) ~> authHeader ~> routesUnderTest ~> check {
          status shouldEqual StatusCodes.InternalServerError
          assertErrorResponse(responseAs[Json], "paymentGatewayIssue")
        }
      }
    }

    "creating a new withdrawal" should {

      "return 200 OK with valid RedirectData if punter is active" in {
        val routesUnderTest = buildRoutes()

        Post(
          "/payments/withdrawal",
          makePaymentRequest(validOnlineMinWithdrawal)) ~> authHeader ~> routesUnderTest ~> check {
          status shouldEqual StatusCodes.OK

          jsonFieldDecoded[String]("redirectUrl") shouldBe defined
          jsonFieldDecoded[String]("paymentReference") shouldBe defined
        }
      }

      "return 400 Bad Request in case there's not enough funds in the wallet" in {
        val routesUnderTest = buildRoutes()

        Post(
          "/payments/withdrawal",
          makePaymentRequest(DefaultCurrencyMoney(100000000))) ~> authHeader ~> routesUnderTest ~> check {
          status shouldEqual StatusCodes.BadRequest
          assertErrorResponse(responseAs[Json], "insufficientFunds")
        }
      }

      "return 403 Forbidden with correct error code if punter is suspended" in {
        val routesUnderTest = buildRoutes(punters = new PuntersContextProviderSuccess(exampleSuspendedPunterProfile))

        Post(
          "/payments/withdrawal",
          makePaymentRequest(validOnlineMinWithdrawal)) ~> authHeader ~> routesUnderTest ~> check {
          status shouldEqual StatusCodes.Forbidden
          assertErrorResponse(responseAs[Json], "punterIsSuspended")
        }
      }

      "return 200 OK with valid RedirectData if punter is cooling off" in {
        val routesUnderTest = buildRoutes(punters = new PuntersContextProviderSuccess(exampleCoolingOffPunterProfile))

        Post(
          "/payments/withdrawal",
          makePaymentRequest(validOnlineMinWithdrawal)) ~> authHeader ~> routesUnderTest ~> check {
          status shouldEqual StatusCodes.OK

          jsonFieldDecoded[String]("redirectUrl") shouldBe defined
          jsonFieldDecoded[String]("paymentReference") shouldBe defined
        }
      }

      "return 403 Forbidden with correct error code if punter is deleted" in {
        val routesUnderTest = buildRoutes(punters = new PuntersContextProviderSuccess(exampleDeletedPunterProfile))

        Post(
          "/payments/withdrawal",
          makePaymentRequest(validOnlineMinWithdrawal)) ~> authHeader ~> routesUnderTest ~> check {
          status shouldEqual StatusCodes.Forbidden
          assertErrorResponse(responseAs[Json], "punterIsDeleted")
        }
      }

      "return 403 Forbidden with correct error code if punter doesn't exist" in {
        val routesUnderTest = buildRoutes(punters = new PuntersContextProviderFailure())

        Post(
          "/payments/withdrawal",
          makePaymentRequest(validOnlineMinWithdrawal)) ~> authHeader ~> routesUnderTest ~> check {
          status shouldEqual StatusCodes.Forbidden
        }
      }

      "return 404 NotFound with correct error code if wallet doesn't exist" in {
        val routesUnderTest = buildRoutes(wallets = new WalletContextProviderFailure {
          override def reserveForWithdrawal(
              walletId: WalletsBoundedContextProtocol.WalletId,
              withdrawal: WalletsBoundedContextProtocol.WithdrawalReservation)(implicit
              ec: ExecutionContext): EitherT[Future, ReservationError, WalletFundsReserved] =
            EitherT.leftT(WalletNotFoundError(WalletsDataGenerator.generateWalletId()))
        })

        Post(
          "/payments/withdrawal",
          makePaymentRequest(validOnlineMinWithdrawal)) ~> authHeader ~> routesUnderTest ~> check {
          status shouldEqual StatusCodes.NotFound
          assertErrorResponse(responseAs[Json], "walletNotFound")
        }
      }

      "return 500 InternalServerError with correct error code if payments service fails" in {
        val routesUnderTest = buildRoutes(payments = PaymentsServiceMock.failing())

        Post(
          "/payments/withdrawal",
          makePaymentRequest(validOnlineMinWithdrawal)) ~> authHeader ~> routesUnderTest ~> check {
          status shouldEqual StatusCodes.InternalServerError
          assertErrorResponse(responseAs[Json], "paymentGatewayIssue")
        }
      }
    }

    "creating a new cheque withdrawal" should {

      "return 200 OK if punter is active" in {
        val routesUnderTest = buildRoutes()

        Post(
          "/payments/cheque-withdrawal",
          makePaymentRequest(validOnlineMinWithdrawal)) ~> authHeader ~> routesUnderTest ~> check {
          status shouldEqual StatusCodes.OK

          jsonFieldDecoded[String]("transactionId") shouldBe defined
        }
      }

      "return 400 Bad Request in case there's not enough funds in the wallet" in {
        val routesUnderTest = buildRoutes()

        Post(
          "payments/cheque-withdrawal",
          makePaymentRequest(DefaultCurrencyMoney(100000000))) ~> authHeader ~> routesUnderTest ~> check {
          status shouldEqual StatusCodes.BadRequest
          assertErrorResponse(responseAs[Json], "insufficientFunds")
        }
      }

      "return 403 Forbidden with correct error code if punter is suspended" in {
        val routesUnderTest = buildRoutes(punters = new PuntersContextProviderSuccess(exampleSuspendedPunterProfile))

        Post(
          "payments/cheque-withdrawal",
          makePaymentRequest(validOnlineMinWithdrawal)) ~> authHeader ~> routesUnderTest ~> check {
          status shouldEqual StatusCodes.Forbidden
          assertErrorResponse(responseAs[Json], "punterIsSuspended")
        }
      }

      "return 200 OK if punter is cooling off" in {
        val routesUnderTest = buildRoutes(punters = new PuntersContextProviderSuccess(exampleCoolingOffPunterProfile))

        Post(
          "payments/cheque-withdrawal",
          makePaymentRequest(validOnlineMinWithdrawal)) ~> authHeader ~> routesUnderTest ~> check {
          status shouldEqual StatusCodes.OK
        }
      }

      // TODO (PHXD-2669): consider extracting and reusing PhoenixRestRoutesSpec#checkPermissions so that we can test all the states at once
      "return 403 Forbidden if punter is deleted" in {
        val routesUnderTest = buildRoutes(punters = new PuntersContextProviderSuccess(exampleDeletedPunterProfile))

        Post(
          "payments/cheque-withdrawal",
          makePaymentRequest(validOnlineMinWithdrawal)) ~> authHeader ~> routesUnderTest ~> check {
          status shouldEqual StatusCodes.Forbidden
          assertErrorResponse(responseAs[Json], "punterIsDeleted")
        }
      }

      "return 403 Forbidden with correct error code if punter doesn't exist" in {
        val routesUnderTest = buildRoutes(punters = new PuntersContextProviderFailure())

        Post(
          "payments/cheque-withdrawal",
          makePaymentRequest(validOnlineMinWithdrawal)) ~> authHeader ~> routesUnderTest ~> check {
          status shouldEqual StatusCodes.Forbidden
        }
      }
    }

    "checking transaction status" should {
      "return 404 for unknown transaction" in {
        val routesUnderTest = buildRoutes()

        Get("payments/transactions/tx-2137") ~> authHeader ~> routesUnderTest ~> check {
          status shouldEqual StatusCodes.NotFound
        }
      }

      "return 200 with transaction details otherwise" in {
        val expectedTransaction = PaymentTransaction(
          transactionId = TransactionId("tx-1"),
          punterId = PunterId("punter-1"),
          direction = PaymentDirection.Withdrawal,
          amount = MoneyAmount(21.37),
          status = TransactionStatus.Pending)

        val routesUnderTest = buildRoutes(transactions = new TransactionRepository {
          override def upsert(transaction: PaymentTransaction): Future[Unit] = Future.unit

          override def find(punterId: PunterId, txId: TransactionId): OptionT[Future, PaymentTransaction] =
            OptionT.some(expectedTransaction)
        })

        Get("payments/transactions/tx-1") ~> authHeader ~> routesUnderTest ~> check {
          status shouldEqual StatusCodes.OK

          jsonFieldDecoded[String]("transactionId") shouldBe Some("tx-1")
          jsonFieldDecoded[String]("punterId") shouldBe Some("punter-1")
          jsonFieldDecoded[String]("direction") shouldBe Some("WITHDRAWAL")
          jsonFieldDecoded[BigDecimal]("amount") shouldBe Some(BigDecimal(21.37))
          jsonFieldDecoded[String]("status") shouldBe Some("PENDING")
        }
      }
    }

    "creating a cash withdrawal" should {

      "return 200 OK with cash withdrawal identifier if punter is active" in {
        val routesUnderTest = buildRoutes(punters = profileProvidingPuntersContext(loggedInPunter))

        Post(
          "/payments/cash-withdrawal",
          makePaymentRequest(validCashMinWithdrawal)) ~> authHeader ~> routesUnderTest ~> check {
          status shouldEqual StatusCodes.OK

          jsonFieldDecoded[String]("identifier") shouldBe defined
        }
      }

      "return 400 Bad Request in case the withdrawal amount less then 50" in {
        val routesUnderTest = buildRoutes(punters = profileProvidingPuntersContext(loggedInPunter))

        Post(
          "/payments/cash-withdrawal",
          makePaymentRequest(invalidCashMinWithdrawal)) ~> authHeader ~> routesUnderTest ~> check {
          status shouldEqual StatusCodes.BadRequest
          assertErrorResponse(responseAs[Json], "tooSmallWithdrawAmount")
        }
      }

      "return 400 BadRequest in case there's not enough funds in the wallet" in {
        val requestedWithdrawalAmount = DefaultCurrencyMoney(100000000)
        val walletsContext = new WalletContextProviderSuccess(clock) {
          override def reserveForWithdrawal(walletId: WalletId, withdrawal: WithdrawalReservation)(implicit
              ec: ExecutionContext): EitherT[Future, ReservationError, WalletFundsReserved] =
            EitherT.cond[Future][ReservationError, WalletFundsReserved](
              withdrawal.funds.value < RealMoney(requestedWithdrawalAmount),
              WalletFundsReserved(
                ReservationId("reservation-1"),
                Balance(RealMoney(DefaultCurrencyMoney(0)), Seq.empty)),
              InsufficientFundsError(walletId))
        }

        val routesUnderTest =
          buildRoutes(punters = profileProvidingPuntersContext(loggedInPunter), wallets = walletsContext)

        Post(
          "/payments/cash-withdrawal",
          makePaymentRequest(requestedWithdrawalAmount)) ~> authHeader ~> routesUnderTest ~> check {
          status shouldEqual StatusCodes.BadRequest
          assertErrorResponse(responseAs[Json], "insufficientFunds")
        }
      }

      "return 403 Forbidden with correct error code if punter is suspended" in {
        val routesUnderTest = buildRoutes(punters = new PuntersContextProviderSuccess(exampleSuspendedPunterProfile))

        Post(
          "/payments/cash-withdrawal",
          makePaymentRequest(validCashMinWithdrawal)) ~> authHeader ~> routesUnderTest ~> check {
          status shouldEqual StatusCodes.Forbidden
          assertErrorResponse(responseAs[Json], "punterIsSuspended")
        }
      }

      "return 200 OK with cash withdrawal identifier if punter is cooling off" in {
        val routesUnderTest = buildRoutes(punters = new PuntersContextProviderSuccess(loggedInCoolingOffPunter))

        Post(
          "/payments/cash-withdrawal",
          makePaymentRequest(validCashMinWithdrawal)) ~> authHeader ~> routesUnderTest ~> check {
          status shouldEqual StatusCodes.OK

          jsonFieldDecoded[String]("identifier") shouldBe defined
        }
      }

      "return 403 Forbidden with correct error code if punter is deleted" in {
        val routesUnderTest = buildRoutes(punters = new PuntersContextProviderSuccess(exampleDeletedPunterProfile))

        Post(
          "/payments/cash-withdrawal",
          makePaymentRequest(validCashMinWithdrawal)) ~> authHeader ~> routesUnderTest ~> check {
          status shouldEqual StatusCodes.Forbidden
          assertErrorResponse(responseAs[Json], "punterIsDeleted")
        }
      }

      "return 403 Forbidden with correct error code if punter doesn't exist" in {
        val routesUnderTest = buildRoutes(punters = new PuntersContextProviderFailure())

        Post(
          "/payments/cash-withdrawal",
          makePaymentRequest(validCashMinWithdrawal)) ~> authHeader ~> routesUnderTest ~> check {
          status shouldEqual StatusCodes.Forbidden
          assertErrorResponse(responseAs[Json], "punterProfileDoesNotExist")
        }
      }
    }

    def makePaymentRequest(amount: DefaultCurrencyMoney): PaymentRequest =
      PaymentRequest(PositiveAmount.ensure(amount).unsafe())
  }

  val registeredUser = generateRegisteredUser()

  val authenticationRepository = new MemorizingTestAuthenticationRepository() {
    override def findUser(userId: UserLookupId): Future[Option[RegisteredUserKeycloak]] =
      Future.successful(Some(registeredUser.toKeycloakUser()))
  }
  val puntersRepository = new InMemoryPuntersRepository() {
    override def findByPunterId(punterId: PunterId): OptionT[Future, Punter] =
      OptionT.fromOption(Some(registeredUser.toPunter()))
  }

  private def profileProvidingPuntersContext(punterProfile: PunterProfile) =
    new PuntersContextProviderSuccess() {
      override def getPunterProfile(id: PunterId)(implicit
          ec: ExecutionContext): EitherT[Future, PuntersBoundedContext.PunterProfileDoesNotExist, PunterProfile] =
        EitherT.safeRightT(punterProfile)
    }

  val sessionId = SessionId.fromUUID(UUID.fromString("bfbd5b18-df06-11eb-ba80-0242ac130004"))
  val loggedInPunter: PunterProfile =
    PunterProfile(
      generatePunterId(),
      depositLimits = PuntersContextProviderSuccess.exampleDepositLimits,
      stakeLimits = PuntersContextProviderSuccess.exampleStakeLimits,
      sessionLimits = Api.exampleSessionLimits,
      status = PunterStatus.Active,
      exclusionStatus = None,
      isTestAccount = false,
      endedSessions = List.empty,
      maybeCurrentSession =
        Some(StartedSession(sessionId, startedAt = clock.currentOffsetDateTime(), ipAddress = None)),
      passwordResetRequired = false,
      verifiedAt = None,
      activationPath = None)

  val loggedInCoolingOffPunter: PunterProfile =
    exampleCoolingOffPunterProfile.copy(maybeCurrentSession =
      Some(StartedSession(sessionId, startedAt = clock.currentOffsetDateTime(), ipAddress = None)))

  private def buildRoutes(
      punters: PuntersBoundedContext = new PuntersContextProviderSuccess(),
      wallets: WalletsBoundedContext = new WalletContextProviderSuccess(clock),
      authenticationRepository: AuthenticationRepository = authenticationRepository,
      puntersRepository: PuntersRepository = puntersRepository,
      payments: PaymentsService = PaymentsServiceMock.successful(generateStartedPaymentSession()),
      transactions: TransactionRepository = new InMemoryTransactionRepository()): Route = {

    val paymentsModule =
      PaymentsModule.init(
        punters,
        wallets,
        authenticationRepository,
        puntersRepository,
        generatePaymentsConfig(),
        jwtAuthenticator,
        RandomUUIDGenerator,
        clock)(
        payments,
        transactions,
        new InMemoryCashWithdrawalReservationsRepository(),
        new InMemoryPaymentNotificationsRepository())

    Route.seal(paymentsModule.routes.payments.toAkkaHttp)
  }
}
