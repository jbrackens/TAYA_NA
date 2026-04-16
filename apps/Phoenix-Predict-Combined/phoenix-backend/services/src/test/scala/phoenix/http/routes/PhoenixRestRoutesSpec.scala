package phoenix.http.routes

import java.time.LocalDate
import java.time.OffsetDateTime
import java.time.format.DateTimeFormatter
import java.util.UUID

import scala.concurrent.ExecutionContext
import scala.concurrent.Future
import scala.concurrent.duration._
import scala.util.Try

import akka.http.scaladsl.model.HttpMethods
import akka.http.scaladsl.model.HttpRequest
import akka.http.scaladsl.model.StatusCodes
import akka.http.scaladsl.model.headers._
import akka.http.scaladsl.server.Route
import akka.http.scaladsl.testkit.RouteTestTimeout
import cats.data.EitherT
import cats.data.OptionT
import cats.syntax.either._
import cats.syntax.traverse._
import com.typesafe.config.Config
import com.typesafe.config.ConfigFactory
import io.circe.Json
import io.circe.literal._
import io.circe.parser._
import io.circe.syntax._
import io.scalaland.chimney.dsl._
import monocle.Monocle.toAppliedFocusOps
import org.scalactic.TypeCheckedTripleEquals
import org.scalatest.Assertion
import org.scalatest.GivenWhenThen
import org.scalatest.Inspectors
import org.scalatest.OptionValues
import org.scalatest.concurrent.ScalaFutures
import org.scalatest.matchers.MatchResult
import org.scalatest.matchers.Matcher

import phoenix.auditlog.domain.AuditLogger
import phoenix.auditlog.infrastructure.http.AuditLogBackofficeRoutes
import phoenix.auditlog.support.InMemoryAuditLogRepository
import phoenix.bets.AlwaysValidGeolocationValidator
import phoenix.bets.BetEntity.BetId
import phoenix.bets.BetProtocol.BetRequest
import phoenix.bets.BetState
import phoenix.bets.BetsBoundedContext
import phoenix.bets.BetsBoundedContext.BetStatus
import phoenix.bets.BetsBoundedContext.BetType
import phoenix.bets.BetsBoundedContext.BetView
import phoenix.bets.BetsBoundedContext.Leg
import phoenix.bets.BetsDomainConfig
import phoenix.bets.GeolocationValidator
import phoenix.bets.Stake
import phoenix.bets.domain.MarketBetsRepository
import phoenix.bets.domain.PunterStake
import phoenix.bets.domain.PunterStakeRepository
import phoenix.bets.infrastructure.BetJsonFormats.betRequestCodec
import phoenix.bets.infrastructure.http.BetRoutes
import phoenix.bets.support.BetDataGenerator.generateBetsDomainConfig
import phoenix.bets.support.BetsBoundedContextMock
import phoenix.bets.support.TestMarketBetsRepository
import phoenix.bets.support.TestPunterStakeRepository
import phoenix.boundedcontexts.market.MarketBoundedContextMock
import phoenix.boundedcontexts.market.MarketBoundedContextMock.FixtureDetailResponse
import phoenix.boundedcontexts.market.MarketBoundedContextMock.FixtureNavigationDataResponse
import phoenix.boundedcontexts.punter.MemorizedTestPuntersContext
import phoenix.boundedcontexts.punter.PuntersContextProviderFailure
import phoenix.boundedcontexts.punter.PuntersContextProviderSuccess
import phoenix.boundedcontexts.punter.PuntersContextProviderSuccess._
import phoenix.boundedcontexts.wallet.MemorizedTestWalletsContext
import phoenix.boundedcontexts.wallet.WalletContextProviderFailure
import phoenix.boundedcontexts.wallet.WalletContextProviderSuccess
import phoenix.core.Clock
import phoenix.core.EitherTUtils._
import phoenix.core.JsonFormats.offsetDateTimeCodec
import phoenix.core.ScalaObjectUtils._
import phoenix.core.TimeUtils._
import phoenix.core.currency.DefaultCurrencyMoney
import phoenix.core.domain.DataProvider
import phoenix.core.emailing.EmailSender
import phoenix.core.emailing.EmailSenderStub
import phoenix.core.emailing.EmailingModule
import phoenix.core.odds.Odds
import phoenix.core.pagination.PaginatedResult
import phoenix.core.pagination.Pagination
import phoenix.dbviews.infrastructure.View01PatronDetailsRepository
import phoenix.dbviews.support.InMemoryView01PatronDetailsRepository
import phoenix.geocomply.infrastructure.http.GeoComplyRoutes
import phoenix.geocomply.support.GeoComplyLicenseServiceMock
import phoenix.geocomply.support.GeoComplyServiceMock
import phoenix.http.JsonMarshalling._
import phoenix.http.core.IpAddress
import phoenix.http.infrastructure.CirceJsonAssertions.JsonOps
import phoenix.http.infrastructure.CirceJsonAssertions.jsonFieldOfType
import phoenix.http.infrastructure.CirceJsonAssertions.jsonFieldOfTypeContaining
import phoenix.http.routes.backoffice.BackofficeRoutes
import phoenix.jwt.JwtAuthenticator
import phoenix.jwt.JwtAuthenticatorMock
import phoenix.jwt.JwtAuthenticatorMock.invalidToken
import phoenix.jwt.JwtAuthenticatorMock.punterToken
import phoenix.jwt.Permissions.UserId
import phoenix.jwt.Permissions.Username
import phoenix.markets.MarketsBoundedContext
import phoenix.markets.MarketsBoundedContext.MarketAggregate.CompetitorSummary
import phoenix.markets.MarketsBoundedContext.MarketAggregate.FixtureSummary
import phoenix.markets.MarketsBoundedContext.MarketAggregate.MarketSummary
import phoenix.markets.MarketsBoundedContext.MarketAggregate.SelectionSummary
import phoenix.markets.MarketsBoundedContext.MarketAggregate.SportSummary
import phoenix.markets.MarketsBoundedContext.MarketAggregate.TournamentSummary
import phoenix.markets.MarketsBoundedContext.MarketId
import phoenix.markets.infrastructure.http.MarketRoutes
import phoenix.markets.sports.FixtureLifecycleStatus
import phoenix.markets.sports.SportEntity.CompetitorId
import phoenix.markets.sports.SportEntity.FixtureId
import phoenix.markets.sports.SportEntity.SportId
import phoenix.markets.sports.SportEntity.TournamentId
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
import phoenix.punters.PunterDataGenerator
import phoenix.punters.PunterDataGenerator.Api.generateCoolOffPeriod
import phoenix.punters.PunterDataGenerator.Api.generateSessionId
import phoenix.punters.PunterDataGenerator.generateIpAddress
import phoenix.punters.PunterDataGenerator.generatePunter
import phoenix.punters.PunterDataGenerator.generatePunterSettings
import phoenix.punters.PunterDataGenerator.generatePunterWithPartialSSN
import phoenix.punters.PunterDataGenerator.generatePunterWithSSN
import phoenix.punters.PunterDataGenerator.generatePuntersDomainConfig
import phoenix.punters.PunterDataGenerator.generateRegisteredUser
import phoenix.punters.PunterDataGenerator.generateRegisteredUserKeycloak
import phoenix.punters.PunterDataGenerator.generateTermsContent
import phoenix.punters.PunterDataGenerator.generateTermsDayThreshold
import phoenix.punters.PunterDataGenerator.generateUserPersonalDetails
import phoenix.punters.PunterDataGenerator.getLimitPeriodRawString
import phoenix.punters.PunterDataGenerator.getLimitTypeRawString
import phoenix.punters.PunterEntity.PunterId
import phoenix.punters.PunterProtocol.ReferralCode
import phoenix.punters.PunterState.ActivationPath
import phoenix.punters.PunterState.EndedSession
import phoenix.punters.PunterState.SelfExclusionDuration
import phoenix.punters.PunterState.SelfExclusionOrigin
import phoenix.punters.PuntersBoundedContext._
import phoenix.punters._
import phoenix.punters.application.MaybeValidPassword
import phoenix.punters.domain
import phoenix.punters.domain.AuthenticationRepository.Errors
import phoenix.punters.domain.AuthenticationRepository.Errors.UnauthorizedLoginError
import phoenix.punters.domain.AuthenticationRepository.UserLookupId
import phoenix.punters.domain.SocialSecurityNumber.FullSSN
import phoenix.punters.domain.SocialSecurityNumber.Last4DigitsOfSSN
import phoenix.punters.domain.SocialSecurityNumberOps.FullOrPartialSSNConverters
import phoenix.punters.domain.SuspensionEntity.Deceased
import phoenix.punters.domain.SuspensionEntity.OperatorSuspend
import phoenix.punters.domain.SuspensionEntity.RegistrationIssue
import phoenix.punters.domain._
import phoenix.punters.domain.{Username => PunterUsername}
import phoenix.punters.exclusion.domain.ExcludedPlayer
import phoenix.punters.exclusion.domain.ExcludedPlayersRepository
import phoenix.punters.exclusion.domain.Exclusion
import phoenix.punters.exclusion.domain.ExclusionStatus
import phoenix.punters.exclusion.domain.ExclusionType
import phoenix.punters.exclusion.domain.Name
import phoenix.punters.exclusion.domain.{Address => ExclusionAddress}
import phoenix.punters.exclusion.support.ExclusionDataGenerator.generateExclusionAddress
import phoenix.punters.exclusion.support.InMemoryExcludedPlayersRepository
import phoenix.punters.idcomply.domain.Alert
import phoenix.punters.idcomply.domain.AlertKey
import phoenix.punters.idcomply.domain.AlertMessage
import phoenix.punters.idcomply.domain.Answer
import phoenix.punters.idcomply.domain.AnswerChoices
import phoenix.punters.idcomply.domain.CreateIDPVToken.CreateIDPVTokenWrongRequest
import phoenix.punters.idcomply.domain.Events.KYCResultEventData
import phoenix.punters.idcomply.domain.Events.PunterAnsweredQuestions
import phoenix.punters.idcomply.domain.Events.PunterFailedPhotoVerification
import phoenix.punters.idcomply.domain.Events.PunterGotFailedKYCResponse
import phoenix.punters.idcomply.domain.Events.PunterGotSuccessfulKYCResponse
import phoenix.punters.idcomply.domain.Events.PunterPhotoVerificationTokenStatusWasChecked
import phoenix.punters.idcomply.domain.Events.PunterSignUpStarted
import phoenix.punters.idcomply.domain.Events.PunterWasAskedForPhotoVerification
import phoenix.punters.idcomply.domain.Events.PunterWasAskedQuestions
import phoenix.punters.idcomply.domain.Events.SignUpEventData
import phoenix.punters.idcomply.domain.GetKBAQuestions.KBAQuestionsResult
import phoenix.punters.idcomply.domain.IDPVTokenStatus
import phoenix.punters.idcomply.domain.IDPVTokenStatusResponse
import phoenix.punters.idcomply.domain.IDPVTokenStatusResponse.IDPVUserFields
import phoenix.punters.idcomply.domain.IDPVTokenStatusResponse.IDPVUserFields.DobDay
import phoenix.punters.idcomply.domain.IDPVTokenStatusResponse.IDPVUserFields.DobMonth
import phoenix.punters.idcomply.domain.IDPVTokenStatusResponse.IDPVUserFields.DobYear
import phoenix.punters.idcomply.domain.IDPVUrl
import phoenix.punters.idcomply.domain.IdComplyService
import phoenix.punters.idcomply.domain.Question
import phoenix.punters.idcomply.domain.QuestionId
import phoenix.punters.idcomply.domain.QuestionText
import phoenix.punters.idcomply.domain.RegistrationEventRepository
import phoenix.punters.idcomply.domain.RequestKYC._
import phoenix.punters.idcomply.domain.SubmitKBAAnswers.KBAError
import phoenix.punters.idcomply.domain.SubmitKBAAnswers.KBAErrorKey
import phoenix.punters.idcomply.domain.SubmitKBAAnswers.SubmitKBAAnswersResult
import phoenix.punters.idcomply.domain.SubmitKBAAnswers.{RequestError => SubmitKBAAnswersRequestError}
import phoenix.punters.idcomply.support.IdComplyServiceMock
import phoenix.punters.idcomply.support.InMemoryRegistrationEventRepository
import phoenix.punters.idcomply.support.RegistrationDataGenerator.IDPV.generateFullMatchIDPVTokenStatusResponse
import phoenix.punters.idcomply.support.RegistrationDataGenerator.IDPV.generateIDPVTokenResult
import phoenix.punters.idcomply.support.RegistrationDataGenerator._
import phoenix.punters.infrastructure.PunterJsonFormats._
import phoenix.punters.infrastructure.http.PunterRoutes
import phoenix.punters.infrastructure.http.PunterTapirEndpoints.SignUpRequest
import phoenix.punters.infrastructure.http.PunterTapirEndpoints.SignUpVerification
import phoenix.punters.support.EmptyReportsModule
import phoenix.punters.support.PunterConverters.RegisteredUserOps
import phoenix.punters.support.TestAuthenticationRepository.defaultUserTokenResponse
import phoenix.punters.support._
import phoenix.support.ConstantUUIDGenerator
import phoenix.support.DataGenerator
import phoenix.support.DataGenerator.generateBetData
import phoenix.support.DataGenerator.generateInitializedMarket
import phoenix.support.DataGenerator.generateSelectionOdds
import phoenix.support.DataGenerator.randomElement
import phoenix.support.DataGenerator.randomEnumValue
import phoenix.support.DataGenerator.randomOffsetDateTime
import phoenix.support.DataGenerator.randomString
import phoenix.support.DataGenerator.randomUUID
import phoenix.support.FutureSupport
import phoenix.support.UnsafeValueObjectExtensions._
import phoenix.support.UserGenerator.generateUserPreferences
import phoenix.time.FakeHardcodedClock
import phoenix.utils.UUIDGenerator
import phoenix.utils.unsafe.EitherOps
import phoenix.wallets.WalletsBoundedContext
import phoenix.wallets.WalletsBoundedContextProtocol
import phoenix.wallets.WalletsBoundedContextProtocol.WalletId
import phoenix.wallets.domain.ResponsibilityCheckStatus
import phoenix.wallets.infrastructure.http.WalletRoutes

final class PhoenixRestRoutesSpec
    extends RoutesSpecSupport
    with Inspectors
    with OptionValues
    with TypeCheckedTripleEquals
    with GivenWhenThen
    with ScalaFutures
    with FutureSupport {

  import PhoenixRestRoutesSpec._

  private val corsAllowedOrigins = Seq("http://example.com", "http://hello.example.com")
  private val corsDisallowedOrigin = "http://example.org"

  // This config applies to the actor system provided by akka.http.scaladsl.testkit.RouteTest#system
  // (via RoutesSpecSupport) that the entire akka-http server in this test runs over.
  override def testConfig: Config =
    super.testConfig.withFallback(
      ConfigFactory.parseString("""akka-http-cors.allowed-origins = "http://example.com http://*.example.com""""))

  private val dateFormatter = DateTimeFormatter.ofPattern("MM/dd/yyyy HH:mm:ss")
  implicit val clock = new FakeHardcodedClock()
  val clockFixedTime = clock.fixedTime

  implicit val jwtAuthenticator: JwtAuthenticator =
    JwtAuthenticatorMock.jwtAuthenticatorMock(UserId(ThePunterId.value))

  // The default is 1 second, which is apparently too low in our CI :/
  implicit val routeTestTimeout: RouteTestTimeout = RouteTestTimeout(5.seconds)

  private def buildRoutes(
      puntersBoundedContext: PuntersBoundedContext = new PuntersContextProviderSuccess(),
      walletsBoundedContext: WalletsBoundedContext = new WalletContextProviderSuccess(clock),
      marketsBoundedContext: MarketsBoundedContext = MarketBoundedContextMock.returningAllMarkets,
      betsBoundedContext: BetsBoundedContext = BetsBoundedContextMock.betsSuccessMock(BetState.Status.Open, betData),
      authenticationRepository: AuthenticationRepository = new TestAuthenticationRepository(),
      puntersRepository: PuntersRepository = new InMemoryPuntersRepository(),
      puntersViewRepository: View01PatronDetailsRepository = new InMemoryView01PatronDetailsRepository(clock),
      termsAndConditionsRepository: TermsAndConditionsRepository = new TermsAndConditionsRepositoryMock(),
      multiFactorAuthenticationService: MultiFactorAuthenticationService = new TestMultiFactorAuthenticationService(),
      accountVerificationCodeRepository: AccountVerificationCodeRepository = new AccountVerificationCodeRepositoryStub(
        clock)(),
      emailSender: EmailSender = new EmailSenderStub(),
      geolocationValidator: GeolocationValidator = AlwaysValidGeolocationValidator,
      marketBetsRepository: MarketBetsRepository = new TestMarketBetsRepository(),
      punterStakeRepository: PunterStakeRepository = new TestPunterStakeRepository,
      registrationEventRepository: RegistrationEventRepository = new InMemoryRegistrationEventRepository(),
      limitsHistoryRepository: PunterLimitsHistoryRepository = new InMemoryPunterLimitsHistoryRepository(),
      deviceFingerprintsRepository: PunterDeviceFingerprintsRepository = new InMemoryPunterDeviceFingerprintsRepository(
        clock)(),
      coolOffsHistoryRepository: PunterCoolOffsHistoryRepository = new InMemoryPunterCoolOffsHistoryRepository(),
      idComplyService: IdComplyService = IdComplyServiceMock.failing(),
      noteRepository: NoteRepository = new InMemoryNoteRepository(),
      excludedPlayersRepository: ExcludedPlayersRepository = new InMemoryExcludedPlayersRepository(),
      uuidGenerator: UUIDGenerator = ConstantUUIDGenerator,
      puntersDomainConfig: PuntersDomainConfig = generatePuntersDomainConfig(),
      betsDomainConfig: BetsDomainConfig = generateBetsDomainConfig()): PhoenixRestRoutes = {

    val paymentsModule =
      PaymentsModule.init(
        puntersBoundedContext,
        walletsBoundedContext,
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

    val emailingModule = EmailingModule.init(emailSender)

    new PhoenixRestRoutes(
      new BetRoutes(
        betsBoundedContext,
        walletsBoundedContext,
        marketsBoundedContext,
        puntersBoundedContext,
        marketBetsRepository,
        punterStakeRepository,
        geolocationValidator,
        betsDomainConfig),
      new MarketRoutes(marketsBoundedContext),
      new WalletRoutes(walletsBoundedContext),
      new PunterRoutes(
        puntersBoundedContext,
        walletsBoundedContext,
        betsBoundedContext,
        authenticationRepository,
        puntersRepository,
        puntersViewRepository,
        termsAndConditionsRepository,
        multiFactorAuthenticationService,
        accountVerificationCodeRepository,
        registrationEventRepository,
        limitsHistoryRepository,
        deviceFingerprintsRepository,
        coolOffsHistoryRepository,
        idComplyService,
        excludedPlayersRepository,
        emailingModule.mailer,
        noteRepository,
        uuidGenerator,
        clock,
        puntersDomainConfig),
      new GeoComplyRoutes(GeoComplyServiceMock.failing(), GeoComplyLicenseServiceMock.failing()),
      paymentsModule.routes.payments,
      new BackofficeRoutes(
        _,
        betsBoundedContext,
        MarketBoundedContextMock.returningAllMarkets,
        new PuntersContextProviderSuccess(),
        walletsBoundedContext,
        authenticationRepository,
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
  }

  private val failingRoutes = {
    val punters = new PuntersContextProviderFailure()
    val wallets = new WalletContextProviderFailure()
    val markets = MarketBoundedContextMock.returningAllMarketsException
    val authenticationRepository = new TestAuthenticationRepository()
    val puntersRepository = new InMemoryPuntersRepository()
    val puntersViewRepository = new InMemoryView01PatronDetailsRepository(clock)
    val termsAndConditionsRepository: TermsAndConditionsRepository = new TermsAndConditionsRepositoryMock()
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
    val registrationEventRepository = new InMemoryRegistrationEventRepository()
    val limitsHistoryRepository = new InMemoryPunterLimitsHistoryRepository()
    val coolOffsHistoryRepository = new InMemoryPunterCoolOffsHistoryRepository()
    val idComplyService = IdComplyServiceMock.apply()
    val noteRepository = new InMemoryNoteRepository()
    val noteModule =
      NoteModule.init(puntersRepository, new NoteProjectionsSupport().projections, noteRepository, uuidGenerator, clock)
    val excludedPlayersRepository = new InMemoryExcludedPlayersRepository()
    val emailingModule = EmailingModule.init(new EmailSenderStub())
    val fakeClock = new FakeHardcodedClock()
    new PhoenixRestRoutes(
      new BetRoutes(
        BetsBoundedContextMock.betsWithDomainFailureMock,
        wallets,
        markets,
        new PuntersContextProviderSuccess(),
        new TestMarketBetsRepository(),
        new TestPunterStakeRepository,
        AlwaysValidGeolocationValidator,
        generateBetsDomainConfig()),
      new MarketRoutes(markets),
      new WalletRoutes(wallets),
      new PunterRoutes(
        punters,
        wallets,
        BetsBoundedContextMock.betsWithDomainFailureMock,
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
        fakeClock,
        generatePuntersDomainConfig()),
      new GeoComplyRoutes(GeoComplyServiceMock.failing(), GeoComplyLicenseServiceMock.failing()),
      paymentsModule.routes.payments,
      mountPoint =>
        new BackofficeRoutes(
          mountPoint,
          BetsBoundedContextMock.betsWithDomainFailureMock,
          markets,
          new PuntersContextProviderFailure(),
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
            noteRepository,
            puntersRepository,
            uuidGenerator,
            fakeClock),
          termsAndConditionsRepository,
          _ => Future.successful(()),
          excludedPlayersRepository,
          registrationEventRepository,
          new EmptyReportsModule()))
  }

  private val underTest = Route.seal(buildRoutes().toAkkaHttp)

  private def userFor(punterStatus: PunterStatus): (RegisteredUserKeycloak, PunterProfile, Punter) = {
    val registeredUser = generateRegisteredUser()
    val punterProfile =
      PunterDataGenerator.Api.withStatus(punterStatus).copy(punterId = registeredUser.userId.asPunterId)
    (registeredUser.toKeycloakUser(), punterProfile, registeredUser.toPunter())
  }

  private def punterEnvironmentFor(
      punterStatus: PunterStatus): (PuntersBoundedContext, AuthenticationRepository, PuntersRepository) = {
    val (registeredUserKeycloak, punterProfile, punter) = userFor(punterStatus)
    val punters = new PuntersContextProviderSuccess(punterProfile)

    val authenticationRepository: TestAuthenticationRepository = testAuthenticationRepositoryWithFindUser(
      registeredUserKeycloak)
    val puntersRepository: InMemoryPuntersRepository = puntersRepositoryWithFind(punter)
    (punters, authenticationRepository, puntersRepository)
  }

  private def puntersRepositoryWithFind(punter: Punter) = {
    val puntersRepository = new InMemoryPuntersRepository() {
      override def findByPunterId(punterId: PunterId): OptionT[Future, Punter] =
        OptionT.fromOption(Some(punter))
    }
    puntersRepository
  }

  private def testAuthenticationRepositoryWithFindUser(registeredUser: RegisteredUserKeycloak) = {
    val authenticationRepository = new TestAuthenticationRepository() {
      override def findUser(userId: UserLookupId): Future[Option[RegisteredUserKeycloak]] =
        Future.successful(Some(registeredUser))
    }
    authenticationRepository
  }

  private def buildRoutesFor(punterStatus: PunterStatus): Route = {
    val (puntersBoundedContext, authenticationRepository, puntersRepository) = punterEnvironmentFor(punterStatus)
    buildRoutes(
      puntersBoundedContext = puntersBoundedContext,
      authenticationRepository = authenticationRepository,
      puntersRepository = puntersRepository).toAkkaHttp
  }

  private val underTestFailureCases = Route.seal(failingRoutes.toAkkaHttp)

  def beTheSameCoolOff(right: domain.CoolOffPeriod): CoolOffTestMatcher = CoolOffTestMatcher(right)

  case class CoolOffTestMatcher(right: domain.CoolOffPeriod) extends Matcher[domain.CoolOffPeriod] {
    override def apply(left: domain.CoolOffPeriod): MatchResult = {
      val areEqual =
        left.startTime.toInstant == right.startTime.toInstant && left.endTime.toInstant == right.endTime.toInstant
      MatchResult(areEqual, "Dates are not equal", "Dates are equal")
    }
  }

  "POST /registration/sign-up" should {

    def validRegistrationSignUpRequest(
        dateOfBirth: DateOfBirth = DateOfBirth(day = 23, month = 1, year = 1980),
        verification: Option[SignUpVerification] = None) =
      json"""
         {
           "name": {
             "title": "Mr",
             "firstName": "John",
             "lastName": "Doe"
           },
           "username": "john.doe",
           "password": "TestTest12345%%!!",
           "email": "john.doe@example.com",
           "phoneNumber": "+12 666 666 666",
           "address": {
             "addressLine": "Raritan Road Unit F4B, 1255",
             "city": "Clark",
             "state": "NJ",
             "zipcode": "07066",
             "country": "US"
           },
           "dateOfBirth": {
             "day": ${dateOfBirth.day},
             "month": ${dateOfBirth.month},
             "year": ${dateOfBirth.year}
           },
           "gender": "Male",
           "ssn": "2137",
           "referralCode": "xyz",
           "verification": ${verification},
           "deviceFingerprint": { "visitorId": "jp2gmd", "confidence" : "0.55" }
         }
          """

    val ssn = Last4DigitsOfSSN.fromString("2137").unsafe()

    def twentyOneYearsOldRequest(verification: Option[SignUpVerification] = None): (SignUpRequest, Json) = {
      val now = clock.currentOffsetDateTime()
      val twentyOneYearsAgo = now.minusYears(21)
      val dateOfBirthTwentyOneYearsAgo = DateOfBirth(
        year = twentyOneYearsAgo.getYear,
        month = twentyOneYearsAgo.getMonthValue,
        day = twentyOneYearsAgo.getDayOfMonth)
      val requestAsJsValue = validRegistrationSignUpRequest(dateOfBirthTwentyOneYearsAgo, verification)
      val typedRequest = SignUpRequest(
        PersonalName(
          title = Title("Mr").unsafe(),
          firstName = FirstName("John").unsafe(),
          lastName = LastName("Doe").unsafe()),
        domain.Username.fromStringUnsafe("john.doe"),
        Email.fromStringUnsafe("john.doe@example.com"),
        MobilePhoneNumber("+12 666 666 666"),
        MaybeValidPassword("TestTest12345%%!!"),
        Address(
          addressLine = AddressLine("Raritan Road Unit F4B, 1255").unsafe(),
          city = City("Clark").unsafe(),
          state = State("NJ").unsafe(),
          zipcode = Zipcode("07066").unsafe(),
          country = Country("US").unsafe()),
        dateOfBirthTwentyOneYearsAgo,
        Some(Gender.Male),
        ssn,
        Some(ReferralCode("xyz")),
        Some(DeviceFingerprint(VisitorId("jp2gmd").unsafe(), Confidence(0.55f).unsafe())))
      (typedRequest, requestAsJsValue)
    }

    "fail if the users have already started the registration process reached the limit" in {
      val puntersRepository = new InMemoryPuntersRepository()
      val puntersDomainConfig = generatePuntersDomainConfig()
      val deviceFingerprintsRepository = new InMemoryPunterDeviceFingerprintsRepository(clock)()

      awaitRight(
        List
          .fill(puntersDomainConfig.maximumAmountOfPunters.value)(generatePunter())
          .traverse(puntersRepository.startPunterRegistration(_, startedAt = clock.currentOffsetDateTime())))

      val routes =
        buildRoutes(
          puntersRepository = puntersRepository,
          puntersDomainConfig = puntersDomainConfig,
          deviceFingerprintsRepository = deviceFingerprintsRepository).toAkkaHttp

      Post("/registration/sign-up", validRegistrationSignUpRequest()) ~> routes ~> check {
        status shouldEqual StatusCodes.BadRequest
        assertErrorResponse(responseAs[Json], "maximumAmountOfPuntersCheckNotPassed")
      }
      deviceFingerprintsRepository.deviceFingerprints shouldBe empty
    }

    "fail if the user is not at least 21 years old" in {
      val now = clock.currentOffsetDateTime()
      val almost21YearsOld = now.minusDays(1)
      val twentyYearsOldRequest = validRegistrationSignUpRequest(
        DateOfBirth(
          year = almost21YearsOld.getYear,
          month = almost21YearsOld.getMonthValue,
          day = almost21YearsOld.getDayOfMonth))

      Post("/registration/sign-up", twentyYearsOldRequest) ~> underTest ~> check {
        status shouldEqual StatusCodes.BadRequest
        assertErrorResponse(responseAs[Json], "ageRestrictionNotPassed")
      }
    }

    "fail if a user with same username already exists" in {
      val authenticationRepository = new TestAuthenticationRepository() {
        override def userExists(userId: AuthenticationRepository.UserLookupId): Future[Boolean] =
          Future.successful(userId match {
            case UserLookupId.ByUsername(username) if username.value == "john.doe" => true
            case _                                                                 => false
          })
      }
      val routes = buildRoutes(authenticationRepository = authenticationRepository).toAkkaHttp

      Post("/registration/sign-up", validRegistrationSignUpRequest()) ~> routes ~> check {
        status shouldEqual StatusCodes.Conflict
        assertErrorResponse(responseAs[Json], "conflictingPunterInformation")
      }
    }

    "fail if a user with same email already exists" in {
      val authenticationRepository = new TestAuthenticationRepository() {
        override def userExists(userId: AuthenticationRepository.UserLookupId): Future[Boolean] =
          Future.successful(userId match {
            case UserLookupId.ByEmail(email) if email.value == "john.doe@example.com" => true
            case _                                                                    => false
          })
      }
      val routes = buildRoutes(authenticationRepository = authenticationRepository).toAkkaHttp

      Post("/registration/sign-up", validRegistrationSignUpRequest()) ~> routes ~> check {
        status shouldEqual StatusCodes.Conflict
        assertErrorResponse(responseAs[Json], "conflictingPunterInformation")
      }
    }

    def expectedRegistrationIssue: Alert => SuspensionEntity = {
      case Alert(AlertKey("list.mortality"), _) =>
        Deceased(None, None, "User suspended on KYC fail match due to being on a mortality list")
      case alert =>
        RegistrationIssue(
          s"User suspended on KYC fail match due to specific alerts present in KYC response. Specific alerts: [{key: ${alert.key.value}, message: ${alert.message.value}}]")
    }

    val alertGen: String => Alert = ak => Alert(AlertKey(ak), AlertMessage("Alert Message"))
    val failingAlerts = List(
      alertGen("list.mortality"),
      alertGen("list.pep"),
      alertGen("list.ofac"),
      alertGen("ssn.multi.names"),
      alertGen("address.is.po"),
      alertGen("address.fraud"))
    forAll(List(KYC.generateFullMatch(), KYCMatch.FailMatch, KYCMatch.PartialMatch)) { kycMatch =>
      forAll(failingAlerts) { failingAlert =>
        s"fail if KYC response has failing alert ${failingAlert.key.value} and match: ${kycMatch.simpleObjectName}" in {
          Given("a request in which the user passes the age restriction check")
          val (signUpRequest, jsonRequest) = twentyOneYearsOldRequest()

          Given("an environment in which the KYC request fails")
          val authenticationRepository = new MemorizingTestAuthenticationRepository()
          val registrationEventRepository = new InMemoryRegistrationEventRepository()

          val notFailingAlert = alertGen("not.failing")
          val kycResult =
            KYCResult(kycMatch, generateTransactionId(), List(failingAlert, notFailingAlert), List.empty)
          val idComplyService = IdComplyServiceMock.apply(requestKYCFn = _ => EitherT.safeRightT(kycResult))
          val punters = new MemorizedTestPuntersContext()
          val wallets = new MemorizedTestWalletsContext(clock)
          val noteRepository = new InMemoryNoteRepository()

          val routes = buildRoutes(
            authenticationRepository = authenticationRepository,
            registrationEventRepository = registrationEventRepository,
            idComplyService = idComplyService,
            puntersBoundedContext = punters,
            walletsBoundedContext = wallets,
            noteRepository = noteRepository).toAkkaHttp

          When("the request is made")
          Post("/registration/sign-up", jsonRequest) ~> routes ~> check {
            Then("the response should be a conflict with the correct error id")
            status shouldEqual StatusCodes.Conflict
            assertErrorResponse(responseAs[Json], "punterShouldContactCustomerService")

            And("the user should be created and suspended")
            punters.unverifiedPunterProfileCreations.get().size shouldBe 1
            punters.suspensions.get().size shouldBe 1
            val (_, registrationIssue, _) = punters.suspensions.get().head
            registrationIssue should ===(expectedRegistrationIssue(failingAlert))

            And("the wallet should be created")
            wallets.walletCreations.size shouldBe 1

            And("the correct registration events should have been recorded")
            val punterId = PunterId(defaultUserTokenResponse.userId)
            registrationEventRepository.allEvents(punterId).futureValue should contain theSameElementsAs List(
              PunterSignUpStarted(
                punterId,
                clock.currentOffsetDateTime(),
                signUpRequest.transformInto[SignUpEventData]),
              PunterGotSuccessfulKYCResponse(
                punterId,
                clock.currentOffsetDateTime(),
                KYCResultEventData.fromKYCResult(kycResult)))
            And("the suspend note have been inserted")
            noteRepository.notes should not be empty
            noteRepository.notes.exists(_.text.value.contains(failingAlert.key.value)) shouldBe true
          }
        }
      }
    }
    forAll(KYCErrorKey.values) { errorKey =>
      s"fail requesting KYC information when IDComply respond BadRequest with error ${errorKey.entryName}" in {
        Given("a request")
        val (signUpRequest, jsonRequest) = twentyOneYearsOldRequest()

        Given("an environment in which the KYC request fails on WrongRequest error")
        val authenticationRepository = new MemorizingTestAuthenticationRepository()
        val registrationEventRepository = new InMemoryRegistrationEventRepository()
        val wrongRequest = KYCError.WrongRequest(RequestError(errorKey, "IDComply: Wrong Data"))
        val idComplyService = IdComplyServiceMock.apply(requestKYCFn = _ => EitherT.leftT(wrongRequest))
        val punters = new MemorizedTestPuntersContext()
        val wallets = new MemorizedTestWalletsContext(clock)
        val routes = buildRoutes(
          authenticationRepository = authenticationRepository,
          registrationEventRepository = registrationEventRepository,
          idComplyService = idComplyService,
          puntersBoundedContext = punters,
          walletsBoundedContext = wallets).toAkkaHttp
        val expectedError = errorKey match {
          case KYCErrorKey.UnknownError     => "registrationInformationAdjusting"
          case KYCErrorKey.CityInvalid      => "registrationInformationCityInvalid"
          case KYCErrorKey.CountryInvalid   => "registrationInformationCountryInvalid"
          case KYCErrorKey.ZipInvalid       => "registrationInformationZipInvalid"
          case KYCErrorKey.FirstNameInvalid => "registrationInformationFirstNameInvalid"
          case KYCErrorKey.LastNameInvalid  => "registrationInformationLastNameInvalid"
          case KYCErrorKey.SsnInvalid       => "registrationInformationSsnInvalid"
          case KYCErrorKey.DobInvalid       => "registrationInformationDobInvalid"
          case KYCErrorKey.UserIdInvalid    => "registrationInformationUserIdInvalid"
          case KYCErrorKey.IdNumberInvalid  => "registrationInformationIdNumberInvalid"
          case KYCErrorKey.StateInvalid     => "registrationInformationStateInvalid"
          case KYCErrorKey.DobYearInvalid   => "registrationInformationDobYearInvalid"
        }

        When("the request is made")
        Post("/registration/sign-up", jsonRequest) ~> routes ~> check {
          Then("the response should be a bad request with the correct error id")
          status shouldEqual StatusCodes.BadRequest
          assertErrorResponse(responseAs[Json], expectedError)

          And("the registered user should be removed")
          authenticationRepository.removals should have size 1

          And("the punter and wallet for it should not have been created")
          punters.unverifiedPunterProfileCreations.get() shouldBe List.empty
          wallets.walletCreations shouldBe List.empty

          And("the correct registration events should have been recorded")
          val punterId = PunterId(defaultUserTokenResponse.userId)
          registrationEventRepository.allEvents(punterId).futureValue should contain theSameElementsAs List(
            PunterSignUpStarted(punterId, clock.currentOffsetDateTime(), signUpRequest.transformInto[SignUpEventData]),
            PunterGotFailedKYCResponse(punterId, clock.currentOffsetDateTime(), wrongRequest))
        }
      }
    }

    "return the IDPV url" when {
      val notFailingAlertsForFailOrPartialMatch = List(
        alertGen("vendor.result.fail"),
        alertGen("ssn.not.available"),
        alertGen("ssn.prior.dob"),
        alertGen("dob.not.available"),
        alertGen("dobMonth.not.available"),
        alertGen("record.newer.found"))
      val notFailingAlertsForAllMatches = List(alertGen("address.warning"))

      List(
        KYCResult(KYC.generateFullMatch(), generateTransactionId(), notFailingAlertsForAllMatches, List.empty),
        KYCResult(KYCMatch.FailMatch, generateTransactionId(), notFailingAlertsForFailOrPartialMatch, List.empty),
        KYCResult(KYCMatch.PartialMatch, generateTransactionId(), notFailingAlertsForFailOrPartialMatch, List.empty))
        .foreach { kycResult =>
          s"the kyc response is a ${kycResult.kycMatch.simpleObjectName}" in {
            Given("a request in which the user passes the age restriction check")
            val (signUpRequest, jsonRequest) = twentyOneYearsOldRequest()

            Given("an environment in which the user gets a 'fail' match, and gets asked for IDPV")
            val requestIDPVTokenResult = generateIDPVTokenResult()
            val idpvUrl = IDPVUrl("https://exampleurl.com")

            val authenticationRepository = new MemorizingTestAuthenticationRepository()
            val puntersRepository = new InMemoryPuntersRepository()
            val registrationEventRepository = new InMemoryRegistrationEventRepository()
            val deviceFingerprintsRepository = new InMemoryPunterDeviceFingerprintsRepository(clock)()
            val idComplyService = IdComplyServiceMock.apply(
              requestKYCFn = _ => EitherT.safeRightT(kycResult),
              requestIDPVFn = _ => EitherT.safeRightT(requestIDPVTokenResult),
              createIDPVUrlFn = (_, _) => idpvUrl)
            val punters = new MemorizedTestPuntersContext()
            val wallets = new MemorizedTestWalletsContext(clock)
            val puntersDomainConfig = generatePuntersDomainConfig()
            val routes = buildRoutes(
              authenticationRepository = authenticationRepository,
              puntersRepository = puntersRepository,
              registrationEventRepository = registrationEventRepository,
              deviceFingerprintsRepository = deviceFingerprintsRepository,
              idComplyService = idComplyService,
              puntersBoundedContext = punters,
              walletsBoundedContext = wallets,
              puntersDomainConfig = puntersDomainConfig).toAkkaHttp

            When("the request is made")
            Post("/registration/sign-up", jsonRequest) ~> routes ~> check {
              Then("response status should be OK")
              status shouldEqual StatusCodes.OK

              Then("the type of response should be indicated")
              val response = responseAs[Json]
              response shouldHaveField ("type", jsonFieldOfTypeContaining[String]("REQUIRE_IDPV"))

              Then("the correct url should be returned")
              response shouldHaveField ("idpvRedirectUrl", jsonFieldOfTypeContaining[String](idpvUrl.value))
            }
            Then("the user should have been registered")
            authenticationRepository.registrations should ===(
              List(
                (
                  UserDetailsKeycloak(
                    userName = signUpRequest.username,
                    email = signUpRequest.email,
                    isEmailVerified = false),
                  ValidPassword.fromStringUnsafe("TestTest12345%%!!"))))

            puntersRepository.punterSsns.nonEmpty should ===(true)
            val punterId = puntersRepository.punterSsns.head._1
            punterId should ===(PunterId(defaultUserTokenResponse.userId))
            val punter = await(puntersRepository.findByPunterId(punterId)).head
            punter.details shouldBe PunterPersonalDetails(
              userName = signUpRequest.username,
              name = signUpRequest.name,
              email = signUpRequest.email,
              phoneNumber = signUpRequest.phoneNumber,
              address = signUpRequest.address,
              dateOfBirth = signUpRequest.dateOfBirth,
              gender = signUpRequest.gender,
              isTestAccount = false,
              document = None,
              isPhoneNumberVerified = true)
            punter.ssn should ===(Left(signUpRequest.ssn))
            punter.settings should ===(
              PunterSettings(
                lastSignIn = None,
                userPreferences = UserPreferences.default,
                termsAgreement = TermsAgreement(TermsAcceptedVersion(0), clock.currentOffsetDateTime()),
                signUpDate = clock.currentOffsetDateTime(),
                isRegistrationVerified = false,
                isAccountVerified = false,
                mfaEnabled = puntersDomainConfig.mfa.enabledByDefault))

            Then("the correct registration events should have been recorded")
            registrationEventRepository.allEvents(punterId).futureValue should contain theSameElementsAs List(
              PunterSignUpStarted(
                punterId,
                clock.currentOffsetDateTime(),
                signUpRequest.transformInto[SignUpEventData]),
              PunterGotSuccessfulKYCResponse(
                punterId,
                clock.currentOffsetDateTime(),
                KYCResultEventData.fromKYCResult(kycResult)),
              PunterWasAskedForPhotoVerification(
                punterId,
                clock.currentOffsetDateTime(),
                requestIDPVTokenResult.token,
                requestIDPVTokenResult.openKey))

            Then("the punter and wallet for it should have been created")
            punters.unverifiedPunterProfileCreations.get().size shouldBe 1
            wallets.walletCreations.size shouldBe 1
            And("save the device fingerprint")
            deviceFingerprintsRepository.deviceFingerprints should not be empty
          }
        }
    }

    "fail if after requesting the KYC information we get a FULL match and we realize the SSN was duplicated" in {
      Given("a request in which the user passes the age restriction check")
      val (signUpRequest, jsonRequest) = twentyOneYearsOldRequest()

      Given("an environment in which the user SSN already exists")
      val kycFullMatch = KYC.generateFullMatch()
      val kycResult = KYC.generateKYCResult(kycFullMatch)
      val hashedSSN = FullSSN.from(kycFullMatch.firstFiveDigitsSSN, ssn)
      val authenticationRepository = new MemorizingTestAuthenticationRepository()
      val puntersRepository = new InMemoryPuntersRepository()
      val registrationEventRepository = new InMemoryRegistrationEventRepository()
      val idComplyService = IdComplyServiceMock.apply(requestKYCFn = _ => EitherT.safeRightT(kycResult))
      val punters = new MemorizedTestPuntersContext()
      val wallets = new MemorizedTestWalletsContext(clock)
      val routes = buildRoutes(
        authenticationRepository = authenticationRepository,
        puntersRepository = puntersRepository,
        registrationEventRepository = registrationEventRepository,
        idComplyService = idComplyService,
        puntersBoundedContext = punters,
        walletsBoundedContext = wallets).toAkkaHttp

      val punter = generatePunterWithSSN(ssn = hashedSSN)
      awaitRight(puntersRepository.startPunterRegistration(punter, clock.currentOffsetDateTime()))

      When("the request is made")
      Post("/registration/sign-up", jsonRequest) ~> routes ~> check {
        Then("the response should be conflict")
        status shouldEqual StatusCodes.Conflict
        assertErrorResponse(responseAs[Json], "punterShouldContactCustomerService")

        And("the punter should be created and suspended")
        punters.unverifiedPunterProfileCreations.get().size shouldBe 1
        punters.suspensions.get().size shouldBe 1

        And("the wallet should be created")
        wallets.walletCreations.size shouldBe 1

        And("the correct registration events should have been recorded")
        val punterId = PunterId(defaultUserTokenResponse.userId)
        registrationEventRepository.allEvents(punterId).futureValue should contain theSameElementsAs List(
          PunterSignUpStarted(punterId, clock.currentOffsetDateTime(), signUpRequest.transformInto[SignUpEventData]),
          PunterGotSuccessfulKYCResponse(
            punterId,
            clock.currentOffsetDateTime(),
            KYCResultEventData.fromKYCResult(kycResult)))
      }
    }

    "fail if after requesting the KYC information we get a FULL match and we realize player is on a DGE exclusion list" in {
      Given("a request in which the user passes the age restriction check")
      val (signUpRequest, jsonRequest) = twentyOneYearsOldRequest()

      Given("an environment in which the user is excluded from gambling")
      val kycFullMatch = KYC.generateFullMatch()
      val kycResult = KYC.generateKYCResult(kycFullMatch)
      val fullSSN = FullSSN.from(kycFullMatch.firstFiveDigitsSSN, ssn)
      val idComplyService = IdComplyServiceMock.apply(requestKYCFn = _ => EitherT.safeRightT(kycResult))
      val excludedPlayersRepository = new InMemoryExcludedPlayersRepository()
      val punters = new MemorizedTestPuntersContext()
      val wallets = new MemorizedTestWalletsContext(clock)
      val registrationEventRepository = new InMemoryRegistrationEventRepository()

      await(
        excludedPlayersRepository.upsert(ExcludedPlayer(
          name = Name(firstName = "John", middleName = None, lastName = "Doe"),
          address = ExclusionAddress(
            street1 = "1255 Raritan Road",
            street2 = Some("Unit F4B"),
            city = "Clark",
            state = Some("NJ"),
            country = "US",
            zipcode = "07066"),
          ssn = Some(fullSSN.asRight),
          dateOfBirth = LocalDate
            .of(signUpRequest.dateOfBirth.year, signUpRequest.dateOfBirth.month, signUpRequest.dateOfBirth.day),
          exclusion = Exclusion(
            exclusionType = ExclusionType.Internet,
            status = ExclusionStatus.Active,
            submittedDate = OffsetDateTime.MIN,
            confirmedDate = Some(LocalDate.MIN),
            modifiedDate = None,
            removalDate = None))))

      val routes =
        buildRoutes(
          idComplyService = idComplyService,
          excludedPlayersRepository = excludedPlayersRepository,
          puntersBoundedContext = punters,
          walletsBoundedContext = wallets,
          registrationEventRepository = registrationEventRepository).toAkkaHttp

      When("the request is made")
      Post("/registration/sign-up", jsonRequest) ~> routes ~> check {
        Then("the response should be forbidden")
        status shouldEqual StatusCodes.Conflict
        assertErrorResponse(responseAs[Json], "punterShouldContactCustomerService")

        And("the user should be created and suspended")
        punters.unverifiedPunterProfileCreations.get().size shouldBe 1
        punters.suspensions.get().size shouldBe 1

        And("the wallet should be created")
        wallets.walletCreations.size shouldBe 1

        And("the correct registration events should have been recorded")
        val punterId = PunterId(defaultUserTokenResponse.userId)
        registrationEventRepository.allEvents(punterId).futureValue should contain theSameElementsAs List(
          PunterSignUpStarted(punterId, clock.currentOffsetDateTime(), signUpRequest.transformInto[SignUpEventData]),
          PunterGotSuccessfulKYCResponse(
            punterId,
            clock.currentOffsetDateTime(),
            KYCResultEventData.fromKYCResult(kycResult)))
      }
    }

    forAll(List(Some(generateSignUpVerification()), None)) { maybeVerification =>
      s"return the KBA questions when the kyc result is a FULL match ${maybeVerification.fold("without")(_ => "with")} verification" in {
        Given("a request in which the user passes the age restriction check")
        val (signUpRequest, jsonRequest) = twentyOneYearsOldRequest(verification = maybeVerification)

        Given(s"an environment in which the user gets a full match, and gets asked for KBA questions")
        val kycResult = KYC.generateKYCResult(KYC.generateFullMatch())
        val askKBAQuestionsResult = KBAQuestionsResult.FullMatch(
          generateTransactionId(),
          questions = List(
            Question(
              QuestionId("0"),
              QuestionText("In which county do you live?"),
              AnswerChoices(List("NEWPORT NEWS CITY", "GOSPER", "RIO GRANDE", "None of the above"))),
            Question(
              QuestionId("1"),
              QuestionText("In which zip code have you previously lived?"),
              AnswerChoices(List("36101", "33971", "35425", "None of the above")))))

        val multiFactorAuthenticationService = new TestMultiFactorAuthenticationService() {
          override def approveVerification(
              verificationId: MultifactorVerificationId,
              verificationCode: MultifactorVerificationCode): EitherT[Future, VerificationFailure, Unit] =
            maybeVerification match {
              case Some(verification) if verification.id != verificationId || verification.code != verificationCode =>
                EitherT.leftT(VerificationFailure.IncorrectVerificationCode)
              case _ => EitherT.safeRightT(())
            }
        }
        val authenticationRepository = new MemorizingTestAuthenticationRepository()
        val puntersRepository = new InMemoryPuntersRepository()
        val registrationEventRepository = new InMemoryRegistrationEventRepository()
        val idComplyService = IdComplyServiceMock.apply(
          requestKYCFn = _ => EitherT.safeRightT(kycResult),
          getKBAQuestionsFn = (_, _) => EitherT.safeRightT(askKBAQuestionsResult))
        val punters = new MemorizedTestPuntersContext()
        val wallets = new MemorizedTestWalletsContext(clock)
        val puntersDomainConfig =
          generatePuntersDomainConfig().focus(_.mfa.mandatoryForRegistration).replace(maybeVerification.isDefined)
        val deviceFingerprintsRepository = new InMemoryPunterDeviceFingerprintsRepository(clock)()
        val routes = buildRoutes(
          authenticationRepository = authenticationRepository,
          puntersRepository = puntersRepository,
          registrationEventRepository = registrationEventRepository,
          idComplyService = idComplyService,
          puntersBoundedContext = punters,
          walletsBoundedContext = wallets,
          deviceFingerprintsRepository = deviceFingerprintsRepository,
          puntersDomainConfig = puntersDomainConfig,
          multiFactorAuthenticationService = multiFactorAuthenticationService).toAkkaHttp

        When("the request is made")
        Post("/registration/sign-up", jsonRequest) ~> routes ~> check {
          Then("response status should be OK")
          status shouldEqual StatusCodes.OK

          Then("the type of response should be indicated")
          val response = responseAs[Json]
          response shouldHaveField ("type", jsonFieldOfTypeContaining[String]("KBA_QUESTIONS"))

          Then("the kba questions fields should be returned in the response")
          response shouldHaveField ("punterId", jsonFieldOfType[String])

          response shouldHaveField ("questions", { questions =>
            questions shouldHaveElement (0, { firstQuestion =>
              firstQuestion shouldHaveField ("questionId", jsonFieldOfTypeContaining[String]("0"))
              firstQuestion shouldHaveField ("text", jsonFieldOfTypeContaining[String]("In which county do you live?"))
              firstQuestion shouldHaveField ("choices", jsonFieldOfTypeContaining[List[String]](
                List("NEWPORT NEWS CITY", "GOSPER", "RIO GRANDE", "None of the above")))
            })
            questions shouldHaveElement (1, secondQuestion => {
              secondQuestion shouldHaveField ("questionId", jsonFieldOfTypeContaining[String]("1"))
              secondQuestion shouldHaveField ("text", jsonFieldOfTypeContaining[String](
                "In which zip code have you previously lived?"))
              secondQuestion shouldHaveField ("choices", jsonFieldOfTypeContaining[List[String]](
                List("36101", "33971", "35425", "None of the above")))
            })
          })
        }

        Then("the user should have been registered in keycloak")
        authenticationRepository.registrations should ===(List((
          UserDetailsKeycloak(userName = signUpRequest.username, email = signUpRequest.email, isEmailVerified = false),
          ValidPassword.fromStringUnsafe("TestTest12345%%!!"))))

        And("the user should have been registered in db")
        puntersRepository.punterSsns.nonEmpty should ===(true)
        val punterId = puntersRepository.punterSsns.head._1
        punterId should ===(PunterId(defaultUserTokenResponse.userId))
        val punter = await(puntersRepository.findByPunterId(punterId)).head
        punter.details shouldBe PunterPersonalDetails(
          userName = signUpRequest.username,
          name = signUpRequest.name,
          email = signUpRequest.email,
          phoneNumber = signUpRequest.phoneNumber,
          address = signUpRequest.address,
          dateOfBirth = signUpRequest.dateOfBirth,
          gender = signUpRequest.gender,
          isTestAccount = false,
          document = None,
          isPhoneNumberVerified = true)
        punter.ssn.isRight should ===(true)
        punter.ssn.toLast4Digits should ===(signUpRequest.ssn)
        punter.settings.mfaEnabled should ===(puntersDomainConfig.mfa.enabledByDefault)

        Then("the correct registration events should have been recorded")
        registrationEventRepository.allEvents(punterId).futureValue should contain theSameElementsAs List(
          PunterSignUpStarted(punterId, clock.currentOffsetDateTime(), signUpRequest.transformInto[SignUpEventData]),
          PunterGotSuccessfulKYCResponse(
            punterId,
            clock.currentOffsetDateTime(),
            KYCResultEventData.fromKYCResult(kycResult)),
          PunterWasAskedQuestions(
            punterId,
            clock.currentOffsetDateTime(),
            askKBAQuestionsResult.transactionId,
            askKBAQuestionsResult.questions))

        Then("the punter and wallet for it should have been created")
        punters.unverifiedPunterProfileCreations.get().size shouldBe 1
        wallets.walletCreations.size shouldBe 1
        And("save the device fingerprint")
        deviceFingerprintsRepository.deviceFingerprints should have size 1
      }
    }

    "fail if a username is a valid email address" in {
      val (requestValid, jsonValid) = twentyOneYearsOldRequest()
      val signUpRequest =
        requestValid.copy(username = PunterUsername.fromStringUnsafe(requestValid.username.value + "@"))
      val jsonRequest = jsonValid.mapObject(x => x.add("username", Json.fromString(signUpRequest.username.value)))

      val routes = buildRoutes().toAkkaHttp

      Post("/registration/sign-up", jsonRequest) ~> routes ~> check {
        status shouldEqual StatusCodes.BadRequest
        val responseJson = responseAs[Json]
        assertErrorResponse(responseJson, "usernameIsInvalid")
      }
    }
  }

  "POST /registration/answer-kba-questions" should {
    "fail if no registration events exist for the given punter" in {
      val request = parse(s"""
                       |{
                       |  "punterId": "da4707ee-b5ac-4cb4-86ac-56def006a0be",
                       |  "answers": [
                       |    {
                       |      "questionId": "0",
                       |      "choice": "GOSPER"
                       |    },
                       |    {
                       |      "questionId": "1",
                       |      "choice": "33971"
                       |    }
                       |  ]
                       |}
          """.stripMargin).get
      val punterId = PunterId("da4707ee-b5ac-4cb4-86ac-56def006a0be")

      val authenticationRepository = new MemorizingTestAuthenticationRepository()
      val puntersRepository = new InMemoryPuntersRepository()
      val routes =
        buildRoutes(
          authenticationRepository = authenticationRepository,
          puntersRepository = puntersRepository).toAkkaHttp

      val punter = generatePunter().copy(punterId = punterId)
      puntersRepository.startPunterRegistration(punter, clock.currentOffsetDateTime())

      Post("/registration/answer-kba-questions", request) ~> routes ~> check {
        status shouldEqual StatusCodes.BadRequest
        assertErrorResponse(responseAs[Json], "registrationInformationFailure")

        And("the punter should not be removed")
        await(puntersRepository.findByPunterId(punterId)) shouldBe Some(punter)
      }
    }

    "fail if the latest registration event for the punter is not about asking him questions" in {
      val request = parse(s"""
                       |{
                       |  "punterId": "da4707ee-b5ac-4cb4-86ac-56def006a0be",
                       |  "answers": [
                       |    {
                       |      "questionId": "0",
                       |      "choice": "GOSPER"
                       |    },
                       |    {
                       |      "questionId": "1",
                       |      "choice": "33971"
                       |    }
                       |  ]
                       |}
          """.stripMargin).get
      val punterId = PunterId("da4707ee-b5ac-4cb4-86ac-56def006a0be")

      val registrationEventRepository = new InMemoryRegistrationEventRepository()
      val authenticationRepository = new MemorizingTestAuthenticationRepository()
      val puntersRepository = new InMemoryPuntersRepository()

      val routes = buildRoutes(
        registrationEventRepository = registrationEventRepository,
        authenticationRepository = authenticationRepository,
        puntersRepository = puntersRepository).toAkkaHttp

      val punter = generatePunter().copy(punterId = punterId)
      awaitRight(puntersRepository.startPunterRegistration(punter, clock.currentOffsetDateTime()))
      registrationEventRepository.save(generatePunterAnsweredQuestions(punterId)).futureValue

      Post("/registration/answer-kba-questions", request) ~> routes ~> check {
        status shouldEqual StatusCodes.BadRequest
        assertErrorResponse(responseAs[Json], "registrationInformationFailure")
      }
    }

    "fail if submitting the answers results in failure" in {
      val request = parse(s"""
                       |{
                       |  "punterId": "da4707ee-b5ac-4cb4-86ac-56def006a0be",
                       |  "answers": [
                       |    {
                       |      "questionId": "0",
                       |      "choice": "GOSPER"
                       |    },
                       |    {
                       |      "questionId": "1",
                       |      "choice": "33971"
                       |    },
                       |    {
                       |      "questionId": "2",
                       |      "choice": "THIS WAS WAS NOT ASKED WTF"
                       |    }
                       |  ]
                       |}
          """.stripMargin).get
      val punterId = PunterId("da4707ee-b5ac-4cb4-86ac-56def006a0be")
      val existingQuestions = List(
        Question(QuestionId("0"), QuestionText("Some question text"), AnswerChoices(List("GOSPER", "Other"))),
        Question(QuestionId("1"), QuestionText("Lorem ipsum"), AnswerChoices(List("123", "33971"))))

      val registrationEventRepository = new InMemoryRegistrationEventRepository()
      val idComplyService =
        IdComplyServiceMock.apply(submitKBAAnswersFn = (_, _) =>
          EitherT.leftT(KBAError.WrongRequest(SubmitKBAAnswersRequestError(KBAErrorKey.UnknownError, ""))))
      val authenticationRepository = new MemorizingTestAuthenticationRepository()
      val puntersRepository = new InMemoryPuntersRepository()
      val routes = buildRoutes(
        registrationEventRepository = registrationEventRepository,
        idComplyService = idComplyService,
        authenticationRepository = authenticationRepository,
        puntersRepository = puntersRepository).toAkkaHttp

      val punter = generatePunter().copy(punterId = punterId)
      awaitRight(puntersRepository.startPunterRegistration(punter, clock.currentOffsetDateTime()))

      registrationEventRepository
        .save(generatePunterWasAskedQuestions(punterId).copy(questions = existingQuestions))
        .futureValue

      Post("/registration/answer-kba-questions", request) ~> routes ~> check {
        status shouldEqual StatusCodes.BadRequest
        assertErrorResponse(responseAs[Json], "registrationInformationFailure")

        And("the punter should not be removed")
        await(puntersRepository.findByPunterId(punterId)) shouldBe Some(punter)
      }
    }

    "succeed when the answers are a full match" in {
      val punterId = PunterId("da4707ee-b5ac-4cb4-86ac-56def006a0be")
      val request = parse(s"""
                       |{
                       |  "punterId": "${punterId.value}",
                       |  "answers": [
                       |    {
                       |      "questionId": "0",
                       |      "choice": "GOSPER"
                       |    },
                       |    {
                       |      "questionId": "1",
                       |      "choice": "33971"
                       |    }
                       |  ]
                       |}
          """.stripMargin).get
      val existingQuestions = List(
        Question(QuestionId("0"), QuestionText("Some question text"), AnswerChoices(List("GOSPER", "Other"))),
        Question(QuestionId("1"), QuestionText("Lorem ipsum"), AnswerChoices(List("123", "33971"))))
      val answers = List(Answer(QuestionId("0"), choice = "GOSPER"), Answer(QuestionId("1"), choice = "33971"))
      val existingRegisteredUser = generateRegisteredUser().withDetails(_.copy(isRegistrationVerified = false))
      val existingPunterWasAskedQuestionsEvent =
        generatePunterWasAskedQuestions(punterId).copy(questions = existingQuestions)

      val registrationEventRepository = new InMemoryRegistrationEventRepository()
      val idComplyService =
        IdComplyServiceMock.apply(submitKBAAnswersFn = (_, _) => EitherT.safeRightT(SubmitKBAAnswersResult.FullMatch))
      val authenticationRepository = new MemorizingTestAuthenticationRepository() {
        override def findUser(userId: UserLookupId): Future[Option[RegisteredUserKeycloak]] =
          super.findUser(userId).map(_ => Some(existingRegisteredUser.toKeycloakUser()))
      }
      val puntersRepository = new InMemoryPuntersRepository()
      awaitRight(
        puntersRepository
          .startPunterRegistration(generatePunterWithSSN(punterId = punterId), clock.currentOffsetDateTime()))
      val puntersBoundedContext = new MemorizedTestPuntersContext()
      val noteRepository = new InMemoryNoteRepository()
      val routes = buildRoutes(
        registrationEventRepository = registrationEventRepository,
        idComplyService = idComplyService,
        authenticationRepository = authenticationRepository,
        puntersRepository = puntersRepository,
        puntersBoundedContext = puntersBoundedContext,
        noteRepository = noteRepository).toAkkaHttp

      registrationEventRepository.save(existingPunterWasAskedQuestionsEvent).futureValue

      Post("/registration/answer-kba-questions", request) ~> routes ~> check {
        status shouldEqual StatusCodes.OK

        val response = responseAs[Json]
        response shouldHaveField ("type", jsonFieldOfTypeContaining[String]("SUCCESSFUL_REGISTRATION_AND_VERIFICATION"))
      }

      registrationEventRepository.allEvents(punterId).futureValue should contain theSameElementsAs List(
        existingPunterWasAskedQuestionsEvent,
        PunterAnsweredQuestions(
          punterId,
          clock.currentOffsetDateTime(),
          existingPunterWasAskedQuestionsEvent.transactionId,
          answers))
      puntersRepository.punterSettings(punterId).isRegistrationVerified shouldBe true

      puntersBoundedContext.verifications.get() shouldBe List((punterId, ActivationPath.KBA))

      And("the user should get active note")
      noteRepository.notes.size > 0 shouldBe true
      noteRepository.notes.head.text.value shouldBe "Active: KBA"
    }

    "ask for more answers when the answers are a partial match" in {
      val request = parse(s"""
                       |{
                       |  "punterId": "da4707ee-b5ac-4cb4-86ac-56def006a0be",
                       |  "answers": [
                       |    {
                       |      "questionId": "0",
                       |      "choice": "GOSPER"
                       |    },
                       |    {
                       |      "questionId": "1",
                       |      "choice": "33971"
                       |    }
                       |  ]
                       |}
          """.stripMargin).get
      val punterId = PunterId("da4707ee-b5ac-4cb4-86ac-56def006a0be")
      val existingQuestions = List(
        Question(QuestionId("0"), QuestionText("Some question text"), AnswerChoices(List("GOSPER", "Other"))),
        Question(QuestionId("1"), QuestionText("Lorem ipsum"), AnswerChoices(List("123", "33971"))))
      val answers = List(Answer(QuestionId("0"), choice = "GOSPER"), Answer(QuestionId("1"), choice = "33971"))
      val existingPunterWasAskedQuestionsEvent =
        generatePunterWasAskedQuestions(punterId).copy(questions = existingQuestions)
      val newQuestions = List(
        Question(QuestionId("0"), QuestionText("New question 1"), AnswerChoices(List("FIRST", "SECOND"))),
        Question(QuestionId("1"), QuestionText("Lorem ipsum for new question 2"), AnswerChoices(List("A", "B", "C"))))
      val newQuestionsTransactionId = generateTransactionId()

      val registrationEventRepository = new InMemoryRegistrationEventRepository()
      val idComplyService =
        IdComplyServiceMock.apply(submitKBAAnswersFn = (_, _) =>
          EitherT.safeRightT(SubmitKBAAnswersResult.PartialMatch(newQuestionsTransactionId, newQuestions)))
      val routes = buildRoutes(
        registrationEventRepository = registrationEventRepository,
        idComplyService = idComplyService).toAkkaHttp

      registrationEventRepository.save(existingPunterWasAskedQuestionsEvent).futureValue

      Post("/registration/answer-kba-questions", request) ~> routes ~> check {
        status shouldEqual StatusCodes.OK

        val response = responseAs[Json]
        response shouldHaveField ("type", jsonFieldOfTypeContaining[String]("KBA_QUESTIONS"))

        response shouldHaveField ("punterId", jsonFieldOfTypeContaining[String]("da4707ee-b5ac-4cb4-86ac-56def006a0be"))

        response shouldHaveField ("questions", { questions =>
          questions shouldHaveElement (0, { firstQuestion =>
            firstQuestion shouldHaveField ("questionId", jsonFieldOfTypeContaining[String]("0"))
            firstQuestion shouldHaveField ("text", jsonFieldOfTypeContaining[String]("New question 1"))
            firstQuestion shouldHaveField ("choices", jsonFieldOfTypeContaining[List[String]](List("FIRST", "SECOND")))
          })
          questions shouldHaveElement (1, { secondQuestion =>
            secondQuestion shouldHaveField ("questionId", jsonFieldOfTypeContaining[String]("1"))
            secondQuestion shouldHaveField ("text", jsonFieldOfTypeContaining[String]("Lorem ipsum for new question 2"))
            secondQuestion shouldHaveField ("choices", jsonFieldOfTypeContaining[List[String]](List("A", "B", "C")))
          })
        })
      }

      registrationEventRepository.allEvents(punterId).futureValue should contain theSameElementsAs List(
        existingPunterWasAskedQuestionsEvent,
        PunterAnsweredQuestions(
          punterId,
          clock.currentOffsetDateTime(),
          existingPunterWasAskedQuestionsEvent.transactionId,
          answers),
        PunterWasAskedQuestions(punterId, clock.currentOffsetDateTime(), newQuestionsTransactionId, newQuestions))
    }

    "go to the IDPV flow when the answers are a failed match" in {
      val request = parse(s"""
                       |{
                       |  "punterId": "da4707ee-b5ac-4cb4-86ac-56def006a0be",
                       |  "answers": [
                       |    {
                       |      "questionId": "0",
                       |      "choice": "GOSPER"
                       |    },
                       |    {
                       |      "questionId": "1",
                       |      "choice": "33971"
                       |    }
                       |  ]
                       |}
          """.stripMargin).get
      val punterId = PunterId("da4707ee-b5ac-4cb4-86ac-56def006a0be")
      val existingQuestions = List(
        Question(QuestionId("0"), QuestionText("Some question text"), AnswerChoices(List("GOSPER", "Other"))),
        Question(QuestionId("1"), QuestionText("Lorem ipsum"), AnswerChoices(List("123", "33971"))))
      val existingPunterWasAskedQuestionsEvent =
        generatePunterWasAskedQuestions(punterId).copy(questions = existingQuestions)
      val answers = List(Answer(QuestionId("0"), choice = "GOSPER"), Answer(QuestionId("1"), choice = "33971"))
      val requestIDPVTokenResult = generateIDPVTokenResult()
      val idpvUrl = IDPVUrl("https://exampleurl.com")

      val registrationEventRepository = new InMemoryRegistrationEventRepository()
      val idComplyService =
        IdComplyServiceMock.apply(
          submitKBAAnswersFn = (_, _) => EitherT.safeRightT(SubmitKBAAnswersResult.FailMatch),
          requestIDPVFn = _ => EitherT.safeRightT(requestIDPVTokenResult),
          createIDPVUrlFn = (_, _) => idpvUrl)
      val routes = buildRoutes(
        registrationEventRepository = registrationEventRepository,
        idComplyService = idComplyService).toAkkaHttp

      registrationEventRepository.save(existingPunterWasAskedQuestionsEvent).futureValue

      Post("/registration/answer-kba-questions", request) ~> routes ~> check {
        status shouldEqual StatusCodes.OK

        val response = responseAs[Json]
        response shouldHaveField ("type", jsonFieldOfTypeContaining[String]("REQUIRE_IDPV"))

        Then("the correct url should be returned")
        response shouldHaveField ("idpvRedirectUrl", jsonFieldOfTypeContaining[String](idpvUrl.value))
      }

      registrationEventRepository.allEvents(punterId).futureValue should contain theSameElementsAs List(
        existingPunterWasAskedQuestionsEvent,
        PunterAnsweredQuestions(
          punterId,
          clock.currentOffsetDateTime(),
          existingPunterWasAskedQuestionsEvent.transactionId,
          answers),
        PunterWasAskedForPhotoVerification(
          punterId,
          clock.currentOffsetDateTime(),
          requestIDPVTokenResult.token,
          requestIDPVTokenResult.openKey))
    }
  }

  "POST /registration/start-idpv" when {
    val punterId = ThePunterId
    val idpvUrl = IDPVUrl("https://exampleurl.com")

    checkPermissions(Set(Unverified))(Post("/registration/start-idpv") ~> authHeader) { allowedStatus =>
      "succeed for unverified punter" in {
        val registrationEventRepository = new InMemoryRegistrationEventRepository()
        val tokenResult = generateIDPVTokenResult()
        val idComplyService = IdComplyServiceMock.apply(
          requestIDPVFn = _ => EitherT.safeRightT(tokenResult),
          createIDPVUrlFn = (_, _) => idpvUrl)
        val routes = buildRoutes(
          puntersBoundedContext = new PuntersContextProviderSuccess(PunterDataGenerator.Api.withStatus(allowedStatus)),
          registrationEventRepository = registrationEventRepository,
          idComplyService = idComplyService,
          authenticationRepository = new MemorizingTestAuthenticationRepository()).toAkkaHttp

        Post("/registration/start-idpv") ~> authHeader ~> routes ~> check {
          status shouldEqual StatusCodes.Created

          And("the response should have the expected idpvRedirectUrl")
          val response = responseAs[Json]
          response shouldHaveField ("idpvRedirectUrl", jsonFieldOfTypeContaining[String](idpvUrl.value))

          And("registration event should be stored")
          registrationEventRepository.allEvents(punterId).futureValue should contain theSameElementsAs
          List(PunterWasAskedForPhotoVerification(punterId, clockFixedTime, tokenResult.token, tokenResult.openKey))
        }
      }

      "fail and suspend a punter" in {
        val registrationEventRepository = new InMemoryRegistrationEventRepository()
        val idComplyService = IdComplyServiceMock.apply(
          requestIDPVFn = _ => EitherT.leftT(CreateIDPVTokenWrongRequest),
          createIDPVUrlFn = (_, _) => idpvUrl)
        val puntersBoundedContext = new MemorizedTestPuntersContext(PunterDataGenerator.Api.withStatus(allowedStatus))
        val routes =
          buildRoutes(
            puntersBoundedContext = puntersBoundedContext,
            registrationEventRepository = registrationEventRepository,
            idComplyService = idComplyService,
            authenticationRepository = new MemorizingTestAuthenticationRepository()).toAkkaHttp

        Post("/registration/start-idpv") ~> authHeader ~> routes ~> check {
          status shouldEqual StatusCodes.InternalServerError

          And("punter should be suspended")
          puntersBoundedContext.suspensions.get() should matchPattern {
            case List((`punterId`, RegistrationIssue.IDPVRequestFailed, `clockFixedTime`)) =>
          }

          And("registration event should not be stored")
          registrationEventRepository.allEvents(punterId).futureValue shouldBe empty
        }
      }
    }
  }

  "POST /registration/check-idpv-status" should {
    "fail if the punter was not asked for IDPV verification" in {
      val request = parse(s"""
                       |{
                       |  "punterId": "da4707ee-b5ac-4cb4-86ac-56def006a0be"
                       |}
          """.stripMargin).get
      val punterId = PunterId("da4707ee-b5ac-4cb4-86ac-56def006a0be")

      val registrationEventRepository = new InMemoryRegistrationEventRepository()
      val authenticationRepository = new MemorizingTestAuthenticationRepository()
      val puntersRepository = new InMemoryPuntersRepository()
      val routes = buildRoutes(
        registrationEventRepository = registrationEventRepository,
        authenticationRepository = authenticationRepository,
        puntersRepository = puntersRepository).toAkkaHttp

      val punter = generatePunter().copy(punterId = punterId)
      awaitRight(puntersRepository.startPunterRegistration(punter, clock.currentOffsetDateTime()))
      registrationEventRepository.save(generatePunterAnsweredQuestions(punterId)).futureValue

      Post("/registration/check-idpv-status", request) ~> routes ~> check {
        status shouldEqual StatusCodes.BadRequest
        assertErrorResponse(responseAs[Json], "registrationInformationFailure")

        And("the registered user should not be removed")
        authenticationRepository.removals should have size 0

        And("the ssn should not be removed")
        await(puntersRepository.findByPunterId(punterId)).isDefined shouldBe true
      }
    }

    "fail if the status of the IDPV token response is Created, Activated, or Archived" when {
      List(IDPVTokenStatusResponse.Created, IDPVTokenStatusResponse.Activated, IDPVTokenStatusResponse.Archived)
        .foreach { idpvTokenStatusResponse =>
          s"status response is $idpvTokenStatusResponse" in {
            val request = parse(s"""
                             |{
                             |  "punterId": "da4707ee-b5ac-4cb4-86ac-56def006a0be"
                             |}
                """.stripMargin).get
            val punterId = PunterId("da4707ee-b5ac-4cb4-86ac-56def006a0be")
            val existingPunterWasAskedForIDPVEvent = generatePunterWasAskedForPhotoVerification(punterId)
            val requestIDPVTokenResult = generateIDPVTokenResult()
            val idpvUrl = IDPVUrl("https://exampleurl.com")

            val registrationEventRepository = new InMemoryRegistrationEventRepository()
            val puntersRepository = new InMemoryPuntersRepository()
            val idComplyService =
              IdComplyServiceMock.apply(
                getIDPVTokenStatusFn = _ => Future.successful(idpvTokenStatusResponse),
                requestIDPVFn = _ => EitherT.safeRightT(requestIDPVTokenResult),
                createIDPVUrlFn = (_, _) => idpvUrl)
            val authenticationRepository = new MemorizingTestAuthenticationRepository()

            val routes = buildRoutes(
              registrationEventRepository = registrationEventRepository,
              idComplyService = idComplyService,
              authenticationRepository = authenticationRepository,
              puntersRepository = puntersRepository).toAkkaHttp

            val punter = generatePunter().copy(punterId = punterId)
            awaitRight(puntersRepository.startPunterRegistration(punter, clock.currentOffsetDateTime()))

            registrationEventRepository.save(existingPunterWasAskedForIDPVEvent).futureValue

            Post("/registration/check-idpv-status", request) ~> routes ~> check {
              status shouldEqual StatusCodes.BadRequest
              assertErrorResponse(responseAs[Json], "photoVerificationNotCompleted")

              And("the registered user should not be removed")
              authenticationRepository.removals should have size 0

              And("the ssn should not be removed")
              await(puntersRepository.findByPunterId(punterId)).isDefined shouldBe true
            }
          }
        }
    }

    "fail if the IDPV token response status is Completed, but the status is Failure or Partial matched" when {
      List(IDPVTokenStatusResponse.FailMatch, IDPVTokenStatusResponse.PartialMatch).foreach { idpvTokenStatusResponse =>
        s"status response is $idpvTokenStatusResponse" in {
          val request = parse(s"""
                           |{
                           |  "punterId": "da4707ee-b5ac-4cb4-86ac-56def006a0be"
                           |}
              """.stripMargin).get
          val punterId = PunterId("da4707ee-b5ac-4cb4-86ac-56def006a0be")
          val existingPunterWasAskedForIDPVEvent = generatePunterWasAskedForPhotoVerification(punterId)

          val registrationEventRepository = new InMemoryRegistrationEventRepository()
          val idComplyService =
            IdComplyServiceMock.apply(getIDPVTokenStatusFn = _ => Future.successful(idpvTokenStatusResponse))
          val authenticationRepository = new MemorizingTestAuthenticationRepository()
          val puntersBoundedContext = new MemorizedTestPuntersContext()
          val puntersRepository = new InMemoryPuntersRepository()
          val noteRepository = new InMemoryNoteRepository()

          awaitRight(puntersRepository
            .startPunterRegistration(generatePunterWithPartialSSN(punterId = punterId), clock.currentOffsetDateTime()))
          val routes = buildRoutes(
            puntersBoundedContext = puntersBoundedContext,
            registrationEventRepository = registrationEventRepository,
            idComplyService = idComplyService,
            authenticationRepository = authenticationRepository,
            puntersRepository = puntersRepository,
            noteRepository = noteRepository).toAkkaHttp

          registrationEventRepository.save(existingPunterWasAskedForIDPVEvent).futureValue

          Post("/registration/check-idpv-status", request) ~> routes ~> check {
            status shouldEqual StatusCodes.Conflict

            And("the request should be recorded")
            registrationEventRepository.allEvents(punterId).futureValue should contain theSameElementsAs List(
              existingPunterWasAskedForIDPVEvent,
              PunterPhotoVerificationTokenStatusWasChecked(
                punterId,
                clock.currentOffsetDateTime(),
                IDPVTokenStatus.from(idpvTokenStatusResponse)),
              PunterFailedPhotoVerification(punterId, clock.currentOffsetDateTime()))

            And("the registered user should not be removed")
            authenticationRepository.removals should have size 0

            And("the ssn should not be removed")
            await(puntersRepository.findByPunterId(punterId)).isDefined shouldBe true

            And("the user should be suspended")
            puntersBoundedContext.suspensions.get() should matchPattern {
              case List((`punterId`, RegistrationIssue.RegistrationDataMismatch, `clockFixedTime`)) =>
            }
            And("the user should get suspend note")
            noteRepository.notes.size > 0 shouldBe true
            noteRepository.notes.head.text.value shouldBe "Suspended: Registration Data Mismatch"
          }
        }
      }
    }

    "fail when the IDVP token response is Completed and Full match and DoB is not matched" in {
      val punterId = PunterId("da4707ee-b5ac-4cb4-86ac-56def006a0be")
      val request = parse(s"""{ "punterId": "${punterId.value}" }""").get
      val existingPunterWasAskedForIDPVEvent = generatePunterWasAskedForPhotoVerification(punterId)
      val fullSSN = generateFullSSN()
      val twentyOneYearsAgo = clock.currentOffsetDateTime().minusYears(21).toLocalDate

      val existingPunter = generatePunter()
      val existingPanterDobDifferent = existingPunter
        .copy(punterId = punterId)
        .focus(_.details.dateOfBirth)
        .replace(DateOfBirth.unsafeFrom(twentyOneYearsAgo.plusDays(1)))

      val fullMatchResponse = generateFullMatchIDPVTokenStatusResponse().copy(
        lastName = IDPVUserFields.LastName(existingPunter.details.name.lastName.value),
        ssn = IDPVUserFields.SSN(fullSSN.value),
        dobDay = DobDay(twentyOneYearsAgo.getDayOfMonth),
        dobMonth = DobMonth(twentyOneYearsAgo.getMonthValue),
        dobYear = DobYear(twentyOneYearsAgo.getYear))

      val registrationEventRepository = new InMemoryRegistrationEventRepository()
      val idComplyService =
        IdComplyServiceMock.apply(getIDPVTokenStatusFn = _ => Future.successful(fullMatchResponse))
      val puntersRepository = new InMemoryPuntersRepository()
      val puntersBoundedContext = new MemorizedTestPuntersContext()
      val routes = buildRoutes(
        puntersBoundedContext = puntersBoundedContext,
        registrationEventRepository = registrationEventRepository,
        idComplyService = idComplyService,
        puntersRepository = puntersRepository).toAkkaHttp

      registrationEventRepository.save(existingPunterWasAskedForIDPVEvent).futureValue
      puntersRepository
        .startPunterRegistration(existingPanterDobDifferent, clock.currentOffsetDateTime())
        .value
        .futureValue

      Post("/registration/check-idpv-status", request) ~> routes ~> check {
        status shouldEqual StatusCodes.Conflict
        assertErrorResponse(responseAs[Json], "punterShouldContactCustomerService")

        And("the registered user should be marked as failed")
        puntersRepository.registrationConfirmations.get(punterId).map(_.outcome) should ===(
          Some(RegistrationOutcome.Failed))

        And("the punter should not be removed")
        await(puntersRepository.findByPunterId(punterId)).isDefined shouldBe true
      }

      puntersBoundedContext.suspensions.get() should matchPattern {
        case List((`punterId`, RegistrationIssue.RegistrationDataMismatch, `clockFixedTime`)) =>
      }

      registrationEventRepository.allEvents(punterId).futureValue should contain theSameElementsAs List(
        existingPunterWasAskedForIDPVEvent,
        PunterPhotoVerificationTokenStatusWasChecked(
          punterId,
          clock.currentOffsetDateTime(),
          IDPVTokenStatus.from(fullMatchResponse)))

    }

    "fail when the IDVP token response is Completed and Full match and last name is not matched" in {
      val punterId = PunterId("da4707ee-b5ac-4cb4-86ac-56def006a0be")
      val request = parse(s"""{ "punterId": "${punterId.value}" }""").get
      val existingPunterWasAskedForIDPVEvent = generatePunterWasAskedForPhotoVerification(punterId)
      val fullSSN = generateFullSSN()

      val existingPunter = generatePunterWithSSN(punterId = punterId, ssn = fullSSN)
      val punterDateOfBirth = existingPunter.details.dateOfBirth

      val fullMatchResponseNameDifferent = generateFullMatchIDPVTokenStatusResponse().copy(
        lastName = IDPVUserFields.LastName(existingPunter.details.name.lastName.value.reverse),
        ssn = IDPVUserFields.SSN(fullSSN.value),
        dobDay = DobDay(punterDateOfBirth.day),
        dobMonth = DobMonth(punterDateOfBirth.month),
        dobYear = DobYear(punterDateOfBirth.year))

      val registrationEventRepository = new InMemoryRegistrationEventRepository()
      val idComplyService =
        IdComplyServiceMock.apply(getIDPVTokenStatusFn = _ => Future.successful(fullMatchResponseNameDifferent))
      val puntersBoundedContext = new MemorizedTestPuntersContext()
      val puntersRepository = new InMemoryPuntersRepository()
      val routes = buildRoutes(
        puntersBoundedContext = puntersBoundedContext,
        registrationEventRepository = registrationEventRepository,
        idComplyService = idComplyService,
        puntersRepository = puntersRepository).toAkkaHttp

      registrationEventRepository.save(existingPunterWasAskedForIDPVEvent).futureValue
      puntersRepository.startPunterRegistration(existingPunter, clock.currentOffsetDateTime()).value.futureValue

      Post("/registration/check-idpv-status", request) ~> routes ~> check {
        status shouldEqual StatusCodes.Conflict
        assertErrorResponse(responseAs[Json], "punterShouldContactCustomerService")

        And("the registered user should not be removed")
        await(puntersRepository.findByPunterId(punterId)).isDefined should ===(true)

        And("the ssn should not be removed")
        await(puntersRepository.findByPunterId(punterId)).isDefined shouldBe true
      }

      puntersBoundedContext.suspensions.get() should matchPattern {
        case List((`punterId`, RegistrationIssue.RegistrationDataMismatch, `clockFixedTime`)) =>
      }

      registrationEventRepository.allEvents(punterId).futureValue should contain theSameElementsAs List(
        existingPunterWasAskedForIDPVEvent,
        PunterPhotoVerificationTokenStatusWasChecked(
          punterId,
          clock.currentOffsetDateTime(),
          IDPVTokenStatus.from(fullMatchResponseNameDifferent)))

    }

    "fail when the IDVP token response is Completed and Full match and SSN-last-4-digits is not matched" in {
      val punterId = PunterId("da4707ee-b5ac-4cb4-86ac-56def006a0be")
      val request = parse(s"""{ "punterId": "${punterId.value}" }""").get
      val existingPunterWasAskedForIDPVEvent = generatePunterWasAskedForPhotoVerification(punterId)
      val fullSSN = generateFullSSN()
      val fullSSNDifferent = FullSSN(fullSSN.first5Digits.value + generateFullSSN().last4Digits.value)
      val existingPunter = generatePunterWithSSN(punterId = punterId, ssn = fullSSN)
      val punterDateOfBirth = existingPunter.details.dateOfBirth

      val fullMatchResponse = generateFullMatchIDPVTokenStatusResponse().copy(
        lastName = IDPVUserFields.LastName(existingPunter.details.name.lastName.value),
        ssn = IDPVUserFields.SSN(fullSSNDifferent.value),
        dobDay = DobDay(punterDateOfBirth.day),
        dobMonth = DobMonth(punterDateOfBirth.month),
        dobYear = DobYear(punterDateOfBirth.year))

      val registrationEventRepository = new InMemoryRegistrationEventRepository()
      val idComplyService =
        IdComplyServiceMock.apply(getIDPVTokenStatusFn = _ => Future.successful(fullMatchResponse))
      val puntersBoundedContext = new MemorizedTestPuntersContext()
      val puntersRepository = new InMemoryPuntersRepository()

      val routes = buildRoutes(
        puntersBoundedContext = puntersBoundedContext,
        registrationEventRepository = registrationEventRepository,
        idComplyService = idComplyService,
        puntersRepository = puntersRepository).toAkkaHttp

      registrationEventRepository.save(existingPunterWasAskedForIDPVEvent).futureValue
      puntersRepository.startPunterRegistration(existingPunter, clock.currentOffsetDateTime()).value.futureValue

      Post("/registration/check-idpv-status", request) ~> routes ~> check {
        status shouldEqual StatusCodes.Conflict
        assertErrorResponse(responseAs[Json], "punterShouldContactCustomerService")

        And("the registered user should not be removed")
        await(puntersRepository.findByPunterId(punterId)).isDefined should ===(true)

        And("the ssn should not be removed")
        await(puntersRepository.findByPunterId(punterId)).isDefined shouldBe true
      }

      puntersBoundedContext.suspensions.get() should matchPattern {
        case List((`punterId`, RegistrationIssue.RegistrationDataMismatch, `clockFixedTime`)) =>
      }

      registrationEventRepository.allEvents(punterId).futureValue should contain theSameElementsAs List(
        existingPunterWasAskedForIDPVEvent,
        PunterPhotoVerificationTokenStatusWasChecked(
          punterId,
          clock.currentOffsetDateTime(),
          IDPVTokenStatus.from(fullMatchResponse)))

    }

    "fail when the IDVP token response is Completed and Full match and another user with this SSN already exists" in {
      val punterId = PunterId("da4707ee-b5ac-4cb4-86ac-56def006a0be")
      val request = parse(s"""{ "punterId": "${punterId.value}" }""").get
      val existingPunterWasAskedForIDPVEvent = generatePunterWasAskedForPhotoVerification(punterId)
      val ssn1 = generateFullSSN()
      val punterSsn1 =
        generatePunterWithPartialSSN(punterId = punterId, ssn = ssn1)
      val punterDateOfBirth = punterSsn1.details.dateOfBirth

      val fullMatchResponse = generateFullMatchIDPVTokenStatusResponse().copy(
        lastName = IDPVUserFields.LastName(punterSsn1.details.name.lastName.value),
        ssn = IDPVUserFields.SSN(ssn1.value),
        dobDay = DobDay(punterDateOfBirth.day),
        dobMonth = DobMonth(punterDateOfBirth.month),
        dobYear = DobYear(punterDateOfBirth.year))

      val registrationEventRepository = new InMemoryRegistrationEventRepository()
      val idComplyService =
        IdComplyServiceMock.apply(getIDPVTokenStatusFn = _ => Future.successful(fullMatchResponse))
      val puntersBoundedContext = new MemorizedTestPuntersContext()
      val puntersRepository = new InMemoryPuntersRepository()

      val routes = buildRoutes(
        puntersBoundedContext = puntersBoundedContext,
        registrationEventRepository = registrationEventRepository,
        idComplyService = idComplyService,
        puntersRepository = puntersRepository).toAkkaHttp

      Given("the new SSN belongs to another user")
      val existingPunterWithSsn1 = generatePunterWithSSN(ssn = ssn1)
      awaitRight(puntersRepository.startPunterRegistration(existingPunterWithSsn1, clock.currentOffsetDateTime()))

      awaitRight(puntersRepository.startPunterRegistration(punterSsn1, clock.currentOffsetDateTime()))

      registrationEventRepository.save(existingPunterWasAskedForIDPVEvent).futureValue

      Post("/registration/check-idpv-status", request) ~> routes ~> check {
        status shouldEqual StatusCodes.Conflict
        assertErrorResponse(responseAs[Json], "punterShouldContactCustomerService")

        And("the ssn should not be removed")
        await(puntersRepository.findByPunterId(punterId)).isDefined shouldBe true
      }

      puntersBoundedContext.suspensions.get() should matchPattern {
        case List((`punterId`, RegistrationIssue.DuplicatedSSN, `clockFixedTime`)) =>
      }

      registrationEventRepository.allEvents(punterId).futureValue should contain theSameElementsAs List(
        existingPunterWasAskedForIDPVEvent,
        PunterPhotoVerificationTokenStatusWasChecked(
          punterId,
          clock.currentOffsetDateTime(),
          IDPVTokenStatus.from(fullMatchResponse)))

    }

    "fail when the IDVP token response is Completed and Full match and the player is on the DGE exclusion list" in {
      val punterId = PunterId("da4707ee-b5ac-4cb4-86ac-56def006a0be")
      val request = parse(s"""{ "punterId": "${punterId.value}" }""").get
      val existingPunterWasAskedForIDPVEvent = generatePunterWasAskedForPhotoVerification(punterId)
      val fullSSN = generateFullSSN()

      val existingPunter = generatePunterWithSSN(punterId = punterId, ssn = fullSSN)
      val punterDateOfBirth = existingPunter.details.dateOfBirth

      val fullMatchResponse = generateFullMatchIDPVTokenStatusResponse().copy(
        lastName = IDPVUserFields.LastName(existingPunter.details.name.lastName.value),
        ssn = IDPVUserFields.SSN(fullSSN.value),
        dobDay = DobDay(punterDateOfBirth.day),
        dobMonth = DobMonth(punterDateOfBirth.month),
        dobYear = DobYear(punterDateOfBirth.year))

      val registrationEventRepository = new InMemoryRegistrationEventRepository()
      val idComplyService = IdComplyServiceMock.apply(getIDPVTokenStatusFn = _ => Future.successful(fullMatchResponse))
      val excludedPlayersRepository = new InMemoryExcludedPlayersRepository
      val puntersBoundedContext = new MemorizedTestPuntersContext()
      val puntersRepository = new InMemoryPuntersRepository()

      puntersRepository.startPunterRegistration(existingPunter, clock.currentOffsetDateTime()).value.futureValue

      val routes = buildRoutes(
        registrationEventRepository = registrationEventRepository,
        idComplyService = idComplyService,
        excludedPlayersRepository = excludedPlayersRepository,
        puntersBoundedContext = puntersBoundedContext,
        puntersRepository = puntersRepository).toAkkaHttp

      await(registrationEventRepository.save(existingPunterWasAskedForIDPVEvent))

      Given("Punter excluded from gambling")
      await(
        excludedPlayersRepository.upsert(ExcludedPlayer(
          name = Name(firstName = "John", middleName = None, lastName = "Doe"),
          address = generateExclusionAddress(),
          ssn = Some(fullSSN.asRight),
          dateOfBirth = LocalDate.of(punterDateOfBirth.year, punterDateOfBirth.month, punterDateOfBirth.day),
          exclusion = Exclusion(
            exclusionType = ExclusionType.Internet,
            status = ExclusionStatus.Active,
            submittedDate = OffsetDateTime.MIN,
            confirmedDate = Some(LocalDate.MIN),
            modifiedDate = None,
            removalDate = None))))

      Post("/registration/check-idpv-status", request) ~> routes ~> check {
        status shouldEqual StatusCodes.Conflict
        assertErrorResponse(responseAs[Json], "punterShouldContactCustomerService")
      }

      puntersBoundedContext.suspensions.get() should matchPattern {
        case List((`punterId`, RegistrationIssue.UserIsSelfExcluded, `clockFixedTime`)) =>
      }
    }

    "update user verified status and personal information when the IDVP token response is Completed and Full match and no rules are broken" in {
      //Given
      val punterId = PunterId("da4707ee-b5ac-4cb4-86ac-56def006a0be")
      val request = parse(s"""{ "punterId": "${punterId.value}" }""").get
      val existingPunterWasAskedForIDPVEvent = generatePunterWasAskedForPhotoVerification(punterId)
      val fullSSN = generateFullSSN()
      val existingRegisteredUser = generateRegisteredUser()
        .withDetails(_.copy(ssn = fullSSN.last4Digits, isRegistrationVerified = false))
        .copy(userId = phoenix.punters.domain.UserId(UUID.fromString(punterId.value)))
      val userDateOfBirth = existingRegisteredUser.details.dateOfBirth

      val fullMatchResponse = generateFullMatchIDPVTokenStatusResponse().copy(
        lastName = IDPVUserFields.LastName(existingRegisteredUser.details.name.lastName.value),
        ssn = IDPVUserFields.SSN(fullSSN.value),
        dobDay = DobDay(userDateOfBirth.day),
        dobMonth = DobMonth(userDateOfBirth.month),
        dobYear = DobYear(userDateOfBirth.year))

      val registrationEventRepository = new InMemoryRegistrationEventRepository()
      val idComplyService =
        IdComplyServiceMock.apply(getIDPVTokenStatusFn = _ => Future.successful(fullMatchResponse))
      val authenticationRepository = new MemorizingTestAuthenticationRepository() {
        override def findUser(userId: UserLookupId): Future[Option[RegisteredUserKeycloak]] =
          Future.successful(Some(existingRegisteredUser.toKeycloakUser()))
      }
      val puntersBoundedContext = new MemorizedTestPuntersContext()
      val puntersRepository = new InMemoryPuntersRepository()
      val noteRepository = new InMemoryNoteRepository()
      val routes = buildRoutes(
        registrationEventRepository = registrationEventRepository,
        idComplyService = idComplyService,
        authenticationRepository = authenticationRepository,
        puntersRepository = puntersRepository,
        puntersBoundedContext = puntersBoundedContext,
        noteRepository = noteRepository).toAkkaHttp

      awaitRight(
        puntersRepository.startPunterRegistration(existingRegisteredUser.toPunter(), clock.currentOffsetDateTime()))

      registrationEventRepository.save(existingPunterWasAskedForIDPVEvent).futureValue

      When("calling endpoint")
      Post("/registration/check-idpv-status", request) ~> routes ~> check {
        status shouldEqual StatusCodes.Created
      }

      Then("corrected names are matched")
      val expectedName = existingRegisteredUser.details.name.copy(
        firstName = FirstName(
          fullMatchResponse.firstName.map(_.value).getOrElse(existingRegisteredUser.details.name.firstName.value))
          .unsafe(),
        lastName = LastName(fullMatchResponse.lastName.value).unsafe())

      val expectedAddress = existingRegisteredUser.details.address.copy(
        city = City(fullMatchResponse.city.map(_.value).getOrElse(existingRegisteredUser.details.address.city.value))
          .unsafe(),
        zipcode = Zipcode(
          fullMatchResponse.zip.map(_.value).getOrElse(existingRegisteredUser.details.address.zipcode.value)).unsafe(),
        country = Country(
          fullMatchResponse.country.map(_.value).getOrElse(existingRegisteredUser.details.address.country.value))
          .unsafe(),
        addressLine = AddressLine(
          fullMatchResponse.address.map(_.value).getOrElse(existingRegisteredUser.details.address.addressLine.value))
          .unsafe())
      val expectedDateOfBirth = DateOfBirth(
        day = fullMatchResponse.dobDay.value,
        month = fullMatchResponse.dobMonth.value,
        year = fullMatchResponse.dobYear.value)

      Then("user registration flag is verified")
      puntersRepository.punterSettings.get(punterId).map(_.isRegistrationVerified) shouldBe Some(true)

      Then("corrected names are matched in punters db")
      val punter = await(puntersRepository.findByPunterId(punterId)).get
      punter.details.name should ===(expectedName)
      punter.details.address should ===(expectedAddress)
      punter.details.dateOfBirth should ===(expectedDateOfBirth)

      registrationEventRepository.allEvents(punterId).futureValue should contain theSameElementsAs List(
        existingPunterWasAskedForIDPVEvent,
        PunterPhotoVerificationTokenStatusWasChecked(
          punterId,
          clock.currentOffsetDateTime(),
          IDPVTokenStatus.from(fullMatchResponse)))

      puntersBoundedContext.verifications.get() shouldBe List((punterId, ActivationPath.IDPV))

      And("the user should get active note")
      noteRepository.notes.size > 0 shouldBe true
      noteRepository.notes.head.text.value shouldBe "Active: IDPV"
    }
  }

  "suspended users should get 403 Forbidden " should {
    val registeredUser = generateRegisteredUserKeycloak()
    val testRoutes = buildRoutes(
      puntersBoundedContext = new PuntersContextProviderSuccess() {
        override def getPunterProfile(id: PunterId)(implicit
            ec: ExecutionContext): EitherT[Future, PunterProfileDoesNotExist, PunterProfile] = {
          EitherT.safeRightT(exampleSuspendedPunterProfile)
        }
      },
      authenticationRepository = new TestAuthenticationRepository() {
        override def findUser(userId: UserLookupId): Future[Option[RegisteredUserKeycloak]] =
          userId match {
            case UserLookupId.ByEmail(email) if email.value == registeredUser.details.email.value =>
              Future.successful(Some(registeredUser))
            case UserLookupId.ByUsername(username) if username.value == registeredUser.details.userName.value =>
              Future.successful(Some(registeredUser))
            case _ =>
              Future.successful(None)
          }
      }).toAkkaHttp

    "select cool off" in {
      Post("/punters/cool-off", TheCoolOffRequest) ~> authHeader ~> testRoutes ~> check {
        status shouldEqual StatusCodes.Forbidden
      }
    }
  }

  "deleted users should get 403 Forbidden " should {
    val registeredUser = generateRegisteredUserKeycloak()
    val testRoutes = buildRoutes(
      puntersBoundedContext = new PuntersContextProviderSuccess() {
        override def getPunterProfile(id: PunterId)(implicit
            ec: ExecutionContext): EitherT[Future, PunterProfileDoesNotExist, PunterProfile] = {
          EitherT.safeRightT(exampleDeletedPunterProfile)
        }
      },
      authenticationRepository = new TestAuthenticationRepository() {
        override def findUser(userId: UserLookupId): Future[Option[RegisteredUserKeycloak]] =
          userId match {
            case UserLookupId.ByEmail(email) if email.value == registeredUser.details.email.value =>
              Future.successful(Some(registeredUser))
            case UserLookupId.ByUsername(username) if username.value == registeredUser.details.userName.value =>
              Future.successful(Some(registeredUser))
            case _ =>
              Future.successful(None)
          }
      }).toAkkaHttp

    "select cool off" in {
      Post("/punters/cool-off", TheCoolOffRequest) ~> authHeader ~> testRoutes ~> check {
        status shouldEqual StatusCodes.Forbidden
      }
    }
  }

  private val deviceFingerprint = """{ "visitorId": "jp2gmd", "confidence" : "0.55" }"""

  "POST /login" when {
    val (username, password) = (Username("existing_user"), ValidPassword.fromString("TestTest12345%%!!").unsafe())
    val validPasswordRequestBody =
      parse(
        s""" { "username": "${username.value}", "password": "${password.value}", "deviceFingerprint": $deviceFingerprint } """).get

    checkPermissions(Set(Active, InCoolOff, Unverified))(Post("login", validPasswordRequestBody)) { allowedStatus =>
      "succeed if the credentials passed are correct and the user doesn't have verification enabled" in {
        val registeredUser =
          generateRegisteredUser().withDetails(_.copy(twoFactorAuthEnabled = false, isPhoneNumberVerified = true))
        val authenticationRepository = new MemorizingTestAuthenticationRepository() {
          override def findUser(userId: UserLookupId): Future[Option[RegisteredUserKeycloak]] =
            Future.successful(Some(registeredUser.toKeycloakUser()))
        }
        val puntersRepository = new InMemoryPuntersRepository() {
          override def findByPunterId(punterId: PunterId): OptionT[Future, Punter] =
            OptionT.fromOption(Some(registeredUser.toPunter()))
        }
        val deviceFingerprintsRepository = new InMemoryPunterDeviceFingerprintsRepository(clock)()
        val testRoutes = buildRoutes(
          puntersBoundedContext = new PuntersContextProviderSuccess(PunterDataGenerator.Api.withStatus(allowedStatus)),
          authenticationRepository = authenticationRepository,
          deviceFingerprintsRepository = deviceFingerprintsRepository,
          puntersRepository = puntersRepository).toAkkaHttp

        When("the http request is made")
        Post("/login", validPasswordRequestBody) ~> RemoteAddress.LocalHost ~> testRoutes ~> check {
          Then("the response should have a status code of Ok")
          status shouldEqual StatusCodes.OK

          And("the response should have the expected type")
          val response = responseAs[Json]
          response shouldHaveField ("type", jsonFieldOfTypeContaining[String]("LOGGED_IN"))

          And("the response should have the session information")
          response shouldHaveField ("sessionId", jsonFieldOfType[String])

          And("the response should have the terms information")
          response shouldHaveField ("hasToAcceptTerms", jsonFieldOfType[Boolean])

          And("the response should have the lastSignIn information")
          response shouldHaveField ("lastSignIn", jsonFieldOfType[String])

          And("the response should have the new auth token information")
          response shouldHaveField ("token", { tokenResponse =>
            tokenResponse shouldHaveField ("userId", jsonFieldOfType[String])
            tokenResponse shouldHaveField ("token", jsonFieldOfType[String])
            tokenResponse shouldHaveField ("expiresIn", jsonFieldOfType[Long])
            tokenResponse shouldHaveField ("refreshExpiresIn", jsonFieldOfType[Long])
            tokenResponse shouldHaveField ("refreshToken", jsonFieldOfType[String])
            tokenResponse shouldHaveField ("tokenType", jsonFieldOfType[String])
          })
        }
        And("should update lastSignIn information")
        puntersRepository.punterSettings(registeredUser.userId.asPunterId).lastSignIn shouldBe a[Some[_]]

        And("should save device fingerprint")
        deviceFingerprintsRepository.deviceFingerprints should have size 1
      }

      "succeed if the credentials passed are correct and the user has verification enabled" in {
        val registeredUser = generateRegisteredUser().withDetails(_.copy(twoFactorAuthEnabled = true))
        val deviceFingerprintsRepository = new InMemoryPunterDeviceFingerprintsRepository(clock)()
        val testRoutes = buildRoutes(
          puntersBoundedContext = new PuntersContextProviderSuccess(PunterDataGenerator.Api.withStatus(allowedStatus)),
          authenticationRepository = new TestAuthenticationRepository() {
            override def findUser(userId: UserLookupId): Future[Option[RegisteredUserKeycloak]] =
              Future.successful(Some(KeycloakDataConverter.toKeycloakUser(registeredUser)))
          },
          deviceFingerprintsRepository = deviceFingerprintsRepository,
          puntersRepository = new InMemoryPuntersRepository() {
            override def findByPunterId(punterId: PunterId): OptionT[Future, Punter] =
              OptionT.fromOption(Some(registeredUser.toPunter()))
          }).toAkkaHttp

        Post("/login", validPasswordRequestBody) ~> RemoteAddress.LocalHost ~> testRoutes ~> check {
          status shouldEqual StatusCodes.OK

          val response = responseAs[Json]
          response shouldHaveField ("type", jsonFieldOfTypeContaining[String]("VERIFICATION_REQUESTED"))
          response shouldHaveField ("verificationId", jsonFieldOfType[String])
          And("should not have saved device fingerprint")
          deviceFingerprintsRepository.deviceFingerprints shouldBe empty
        }
      }

      "fail if the user needs to reset their password" in {
        val registeredUser = generateRegisteredUser().withDetails(_.copy(twoFactorAuthEnabled = true))
        val deviceFingerprintsRepository = new InMemoryPunterDeviceFingerprintsRepository(clock)()
        val testRoutes = buildRoutes(
          puntersBoundedContext = new PuntersContextProviderSuccess(
            PunterDataGenerator.Api.withStatus(allowedStatus).copy(passwordResetRequired = true)),
          authenticationRepository = new TestAuthenticationRepository() {
            override def findUser(userId: UserLookupId): Future[Option[RegisteredUserKeycloak]] =
              Future.successful(Some(KeycloakDataConverter.toKeycloakUser(registeredUser)))
          },
          puntersRepository = new InMemoryPuntersRepository() {
            override def findByPunterId(punterId: PunterId): OptionT[Future, Punter] =
              OptionT.fromOption(Some(registeredUser.toPunter()))
          },
          deviceFingerprintsRepository = deviceFingerprintsRepository).toAkkaHttp

        Post("/login", validPasswordRequestBody) ~> RemoteAddress.LocalHost ~> testRoutes ~> check {
          status shouldEqual StatusCodes.Conflict
          assertErrorResponse(responseAs[Json], "punterShouldResetPassword")
        }
        deviceFingerprintsRepository.deviceFingerprints shouldBe empty
      }

      "fail when the credentials are correct, the user has verification enabled but sending the verification code fails due to an invalid phone number" in {
        val registeredUser = generateRegisteredUser().withDetails(_.copy(twoFactorAuthEnabled = true))
        val testRoutes = buildRoutes(
          puntersBoundedContext = new PuntersContextProviderSuccess(PunterDataGenerator.Api.withStatus(allowedStatus)),
          authenticationRepository = new TestAuthenticationRepository() {
            override def findUser(userId: UserLookupId): Future[Option[RegisteredUserKeycloak]] =
              Future.successful(Some(KeycloakDataConverter.toKeycloakUser(registeredUser)))
          },
          puntersRepository = new InMemoryPuntersRepository() {
            override def findByPunterId(punterId: PunterId): OptionT[Future, Punter] =
              OptionT.fromOption(Some(registeredUser.toPunter()))
          },
          multiFactorAuthenticationService = new TestMultiFactorAuthenticationService() {
            override def sendVerificationCode(mobilePhoneNumber: MobilePhoneNumber)
                : EitherT[Future, SendVerificationCodeFailure, MultifactorVerificationId] =
              EitherT.leftT(SendVerificationCodeFailure.InvalidPhoneNumber(mobilePhoneNumber.value))
          }).toAkkaHttp

        Post("/login", validPasswordRequestBody) ~> RemoteAddress.LocalHost ~> testRoutes ~> check {
          status shouldEqual StatusCodes.BadRequest
          assertErrorResponse(responseAs[Json], "invalidPhoneNumber")
        }
      }

      "fail when the credentials are correct, the user has verification enabled but sending the verification code fails due to max attempts limits" in {
        val registeredUser = generateRegisteredUser().withDetails(_.copy(twoFactorAuthEnabled = true))
        val testRoutes = buildRoutes(
          puntersBoundedContext = new PuntersContextProviderSuccess(PunterDataGenerator.Api.withStatus(allowedStatus)),
          authenticationRepository = new TestAuthenticationRepository() {
            override def findUser(userId: UserLookupId): Future[Option[RegisteredUserKeycloak]] =
              Future.successful(Some(KeycloakDataConverter.toKeycloakUser(registeredUser)))
          },
          puntersRepository = new InMemoryPuntersRepository() {
            override def findByPunterId(punterId: PunterId): OptionT[Future, Punter] =
              OptionT.fromOption(Some(registeredUser.toPunter()))
          },
          multiFactorAuthenticationService = new TestMultiFactorAuthenticationService() {
            override def sendVerificationCode(mobilePhoneNumber: MobilePhoneNumber)
                : EitherT[Future, SendVerificationCodeFailure, MultifactorVerificationId] =
              EitherT.leftT(SendVerificationCodeFailure.MaxSendAttemptsReached)
          }).toAkkaHttp

        Post("/login", validPasswordRequestBody) ~> RemoteAddress.LocalHost ~> testRoutes ~> check {
          status shouldEqual StatusCodes.BadRequest
          assertErrorResponse(responseAs[Json], "maxMFASendCodeAttemptsReached")
        }
      }

      "fail when the credentials are correct, the user has verification enabled but sending the verification code fails due to unknown reasons" in {
        val registeredUser = generateRegisteredUser().withDetails(_.copy(twoFactorAuthEnabled = true))
        val testRoutes = buildRoutes(
          puntersBoundedContext = new PuntersContextProviderSuccess(PunterDataGenerator.Api.withStatus(allowedStatus)),
          authenticationRepository = new TestAuthenticationRepository() {
            override def findUser(userId: UserLookupId): Future[Option[RegisteredUserKeycloak]] =
              Future.successful(Some(registeredUser.toKeycloakUser()))
          },
          puntersRepository = new InMemoryPuntersRepository() {
            override def findByPunterId(punterId: PunterId): OptionT[Future, Punter] =
              OptionT.fromOption(Some(registeredUser.toPunter()))
          },
          multiFactorAuthenticationService = new TestMultiFactorAuthenticationService() {
            override def sendVerificationCode(mobilePhoneNumber: MobilePhoneNumber)
                : EitherT[Future, SendVerificationCodeFailure, MultifactorVerificationId] =
              EitherT.leftT(SendVerificationCodeFailure.UnknownSendVerificationCodeFailure)
          }).toAkkaHttp

        Post("/login", validPasswordRequestBody) ~> RemoteAddress.LocalHost ~> testRoutes ~> check {
          status shouldEqual StatusCodes.InternalServerError
          assertErrorResponse(responseAs[Json], "sendVerificationCodeFailure")
        }
      }

      "fail authorization due to non-matching credentials when NOT enforcing a password reset" in {
        Given("a context in which the signIn attempt will fail, and the user exists")
        val registeredUser = {
          val randomValue = generateRegisteredUser()
          randomValue.copy(details = randomValue.details
            .copy(userName = domain.Username.fromStringUnsafe(username.value), twoFactorAuthEnabled = true))
        }
        val punterId = PunterId(registeredUser.userId.value.toString)
        val authenticationRepository = new MemorizingTestAuthenticationRepository() {
          override def signIn(
              username: domain.Username,
              password: MaybeValidPassword): EitherT[Future, Errors.UnauthorizedLoginError.type, UserTokenResponse] =
            EitherT.leftT(UnauthorizedLoginError)

          override def findUser(userId: UserLookupId): Future[Option[RegisteredUserKeycloak]] =
            userId match {
              case UserLookupId.ByUsername(lookupUser) if lookupUser.value == username.value =>
                Future.successful(Some(registeredUser.toKeycloakUser()))
              case _ => Future.successful(None)
            }
        }
        val puntersRepository = new InMemoryPuntersRepository() {
          override def findByPunterId(punterId: PunterId): OptionT[Future, Punter] =
            OptionT.fromOption(Some(registeredUser.toPunter()))
        }

        Given("a context in which the next login failure increment will NOT require password reset")
        val punterProfile = PunterDataGenerator.Api.withStatus(allowedStatus).copy(punterId = punterId)
        val puntersBoundedContext = new MemorizedTestPuntersContext(punterProfile) {
          override def incrementLoginFailureCounter(id: PunterId)(implicit
              ec: ExecutionContext): EitherT[Future, PunterProfileDoesNotExist, PasswordResetRequired] =
            super.incrementLoginFailureCounter(id).map(_ => PasswordResetRequired(false))
        }

        val testRoutes = buildRoutes(
          authenticationRepository = authenticationRepository,
          puntersRepository = puntersRepository,
          puntersBoundedContext = puntersBoundedContext).toAkkaHttp

        When("the request is made")
        Post("/login", validPasswordRequestBody) ~> RemoteAddress.LocalHost ~> testRoutes ~> check {
          Then("we should get an Unauthorized response")
          status shouldEqual StatusCodes.Unauthorized
          assertErrorResponse(responseAs[Json], "unauthorisedResponseDuringLogin")
        }
        And("the failure login counter should be incremented")
        puntersBoundedContext.loginFailureCounterIncrements.get() shouldBe List(punterId)

        And("the user profile should not be updated")
        authenticationRepository.userUpdates shouldBe List.empty
      }

      "fail authorization due to non-matching credentials with a valid password when enforcing a password reset" in {
        Given("a context in which the signIn attempt will fail, and the user exists")
        val registeredUser = {
          val randomValue = generateRegisteredUser()
          randomValue.copy(details = randomValue.details
            .copy(userName = domain.Username.fromStringUnsafe(username.value), twoFactorAuthEnabled = true))
        }
        val punterId = PunterId(registeredUser.userId.value.toString)
        val authenticationRepository = new MemorizingTestAuthenticationRepository() {
          override def signIn(
              username: domain.Username,
              password: MaybeValidPassword): EitherT[Future, Errors.UnauthorizedLoginError.type, UserTokenResponse] =
            EitherT.leftT(UnauthorizedLoginError)

          override def findUser(userId: UserLookupId): Future[Option[RegisteredUserKeycloak]] =
            userId match {
              case UserLookupId.ByUsername(lookupUser) if lookupUser.value == username.value =>
                Future.successful(Some(registeredUser.toKeycloakUser()))
              case _ => Future.successful(None)
            }
        }
        val puntersRepository = new InMemoryPuntersRepository() {
          override def findByPunterId(punterId: PunterId): OptionT[Future, Punter] =
            OptionT.fromOption(Some(registeredUser.toPunter()))
        }

        Given("a context in which the next login failure increment will require password reset")
        val punterProfile = PunterDataGenerator.Api.withStatus(allowedStatus).copy(punterId = punterId)
        val puntersBoundedContext = new MemorizedTestPuntersContext(punterProfile) {
          override def incrementLoginFailureCounter(id: PunterId)(implicit
              ec: ExecutionContext): EitherT[Future, PunterProfileDoesNotExist, PasswordResetRequired] =
            super.incrementLoginFailureCounter(id).map(_ => PasswordResetRequired(true))
        }

        val testRoutes = buildRoutes(
          authenticationRepository = authenticationRepository,
          puntersRepository = puntersRepository,
          puntersBoundedContext = puntersBoundedContext).toAkkaHttp

        When("the request is made")
        Post("/login", validPasswordRequestBody) ~> RemoteAddress.LocalHost ~> testRoutes ~> check {
          Then("we should get an Unauthorized response")
          status shouldEqual StatusCodes.Unauthorized
          assertErrorResponse(responseAs[Json], "unauthorisedResponseRequiringPasswordReset")
        }
        And("the failure login counter should be incremented")
        puntersBoundedContext.loginFailureCounterIncrements.get() shouldBe List(punterId)
      }

      "fail authorization due to non-matching credentials with an invalid password when enforcing a password reset" in {
        Given("a context in which the signIn attempt will fail, and the user exists")
        val registeredUser = {
          val randomValue = generateRegisteredUser()
          randomValue.copy(details = randomValue.details
            .copy(userName = domain.Username.fromStringUnsafe(username.value), twoFactorAuthEnabled = true))
        }
        val punterId = PunterId(registeredUser.userId.value.toString)
        val authenticationRepository = new MemorizingTestAuthenticationRepository() {
          override def signIn(
              username: domain.Username,
              password: MaybeValidPassword): EitherT[Future, Errors.UnauthorizedLoginError.type, UserTokenResponse] =
            EitherT.leftT(UnauthorizedLoginError)

          override def findUser(userId: UserLookupId): Future[Option[RegisteredUserKeycloak]] =
            userId match {
              case UserLookupId.ByUsername(lookupUser) if lookupUser.value == username.value =>
                Future.successful(Some(registeredUser.toKeycloakUser()))
              case _ => Future.successful(None)
            }
        }
        val puntersRepository = new InMemoryPuntersRepository() {
          override def findByPunterId(punterId: PunterId): OptionT[Future, Punter] =
            OptionT.fromOption(Some(registeredUser.toPunter()))
        }

        Given("a context in which the next login failure increment will require password reset")
        val punterProfile = PunterDataGenerator.Api.withStatus(allowedStatus).copy(punterId = punterId)
        val puntersBoundedContext = new MemorizedTestPuntersContext(punterProfile) {
          override def incrementLoginFailureCounter(id: PunterId)(implicit
              ec: ExecutionContext): EitherT[Future, PunterProfileDoesNotExist, PasswordResetRequired] =
            super.incrementLoginFailureCounter(id).map(_ => PasswordResetRequired(true))
        }

        val testRoutes = buildRoutes(
          authenticationRepository = authenticationRepository,
          puntersRepository = puntersRepository,
          puntersBoundedContext = puntersBoundedContext).toAkkaHttp

        When("the request is made")
        val invalidPasswordRequestBody =
          parse(
            s""" { "username": "${username.value}", "password": "invalid", "deviceFingerprint": $deviceFingerprint } """).get
        Post("/login", invalidPasswordRequestBody) ~> RemoteAddress.LocalHost ~> testRoutes ~> check {
          Then("we should get an Unauthorized response")
          status shouldEqual StatusCodes.Unauthorized
          assertErrorResponse(responseAs[Json], "unauthorisedResponseRequiringPasswordReset")
        }
        And("the failure login counter should be incremented")
        puntersBoundedContext.loginFailureCounterIncrements.get() shouldBe List(punterId)
      }

      "fail when the IP header is not set" in {
        val registeredUser = generateRegisteredUser().withDetails(_.copy(twoFactorAuthEnabled = true))
        val testRoutes = buildRoutes(
          puntersBoundedContext = new PuntersContextProviderSuccess(PunterDataGenerator.Api.withStatus(allowedStatus)),
          authenticationRepository = new TestAuthenticationRepository() {
            override def findUser(userId: UserLookupId): Future[Option[RegisteredUserKeycloak]] =
              Future.successful(Some(registeredUser.toKeycloakUser()))
          },
          puntersRepository = new InMemoryPuntersRepository() {
            override def findByPunterId(punterId: PunterId): OptionT[Future, Punter] =
              OptionT.fromOption(Some(registeredUser.toPunter()))
          }).toAkkaHttp

        Post("/login", validPasswordRequestBody) ~> testRoutes ~> check {
          status shouldEqual StatusCodes.Conflict
          assertErrorResponse(responseAs[Json], "undefinedIPAddress")
        }
      }

      "succeed and require verification if phone number has been changed and its verification is required" in {
        val registeredUser = generateRegisteredUser().withDetails(_.copy(isPhoneNumberVerified = false))
        val testRoutes = buildRoutes(
          puntersBoundedContext =
            new PuntersContextProviderSuccess(examplePunterProfile, PunterDataGenerator.Api.withStatus(allowedStatus)),
          authenticationRepository = new TestAuthenticationRepository() {
            override def findUser(userId: UserLookupId): Future[Option[RegisteredUserKeycloak]] =
              Future.successful(Some(registeredUser.toKeycloakUser()))
          },
          puntersRepository = new InMemoryPuntersRepository() {
            override def findByPunterId(punterId: PunterId): OptionT[Future, Punter] =
              OptionT.fromOption(Some(registeredUser.toPunter()))
          }).toAkkaHttp

        Post("/login", validPasswordRequestBody) ~> RemoteAddress.LocalHost ~> testRoutes ~> check {
          status shouldEqual StatusCodes.OK

          val response = responseAs[Json]
          response shouldHaveField ("type", jsonFieldOfTypeContaining[String]("VERIFICATION_REQUESTED"))
          response shouldHaveField ("verificationId", jsonFieldOfType[String])
        }
      }
    }
  }

  "POST /login-with-verification" when {
    val (username, password, verificationId, verificationCode) = (
      Username("some_user"),
      ValidPassword.fromString("TestTest12345%%!!").unsafe(),
      PunterDataGenerator.generateTwilioVerificationId(),
      PunterDataGenerator.generateVerificationCode())

    val requestBody =
      parse(
        s""" { "username": "${username.value}", "password": "${password.value}", "verificationId": "${verificationId.value}", "verificationCode": "${verificationCode.value}", "deviceFingerprint": $deviceFingerprint  } """).get

    val (authenticationRepository, puntersRepository) = {
      val registeredUser = generateRegisteredUser()
      val authenticationRepository = new TestAuthenticationRepository() {
        override def findUser(userId: UserLookupId): Future[Option[RegisteredUserKeycloak]] =
          userId match {
            case UserLookupId.ByUsername(_) =>
              Future.successful(Some(registeredUser.toKeycloakUser()))
            case _ => Future.successful(None)
          }
      }
      val puntersRepository = new InMemoryPuntersRepository() {
        override def findByPunterId(punterId: PunterId): OptionT[Future, Punter] =
          OptionT.fromOption(Some(registeredUser.toPunter()))
      }
      (authenticationRepository, puntersRepository)
    }

    checkPermissions(Set(Active, InCoolOff, Unverified))(Post("login-with-verification", requestBody)) {
      allowedStatus =>
        "fail if the punter has to reset their password" in {
          val deviceFingerprintsRepository = new InMemoryPunterDeviceFingerprintsRepository(clock)()
          val testRoutes = buildRoutes(
            puntersBoundedContext = new PuntersContextProviderSuccess(
              PunterDataGenerator.Api.withStatus(allowedStatus).copy(passwordResetRequired = true)),
            authenticationRepository = authenticationRepository,
            puntersRepository = puntersRepository,
            deviceFingerprintsRepository = deviceFingerprintsRepository).toAkkaHttp

          Post("/login-with-verification", requestBody) ~> RemoteAddress.LocalHost ~> testRoutes ~> check {
            status shouldEqual StatusCodes.Conflict
            assertErrorResponse(responseAs[Json], "punterShouldResetPassword")
          }
          deviceFingerprintsRepository.deviceFingerprints shouldBe empty
        }

        "fail if the verification fails and the punter should NOT reset their password" in {
          val testRoutes = buildRoutes(
            puntersBoundedContext =
              new PuntersContextProviderSuccess(PunterDataGenerator.Api.withStatus(allowedStatus)) {
                override def recordFailedMFAAttempt(id: PunterId)(implicit
                    ec: ExecutionContext): EitherT[Future, PunterProfileDoesNotExist, PasswordResetRequired] =
                  EitherT.safeRightT(PasswordResetRequired(true))
              },
            authenticationRepository = authenticationRepository,
            puntersRepository = puntersRepository,
            multiFactorAuthenticationService = new TestMultiFactorAuthenticationService {
              override def approveVerification(
                  verificationId: MultifactorVerificationId,
                  verificationCode: MultifactorVerificationCode): EitherT[Future, VerificationFailure, Unit] =
                EitherT.leftT(VerificationFailure.IncorrectVerificationCode)
            }).toAkkaHttp

          Post("/login-with-verification", requestBody) ~> RemoteAddress.LocalHost ~> testRoutes ~> check {
            status shouldEqual StatusCodes.Unauthorized
            assertErrorResponse(responseAs[Json], "incorrectMFAVerificationWithPasswordReset")
          }
        }

        "fail if the verification fails and the punter should reset their password" in {
          val testRoutes = buildRoutes(
            puntersBoundedContext =
              new PuntersContextProviderSuccess(PunterDataGenerator.Api.withStatus(allowedStatus)) {
                override def recordFailedMFAAttempt(id: PunterId)(implicit
                    ec: ExecutionContext): EitherT[Future, PunterProfileDoesNotExist, PasswordResetRequired] =
                  EitherT.safeRightT(PasswordResetRequired(false))
              },
            authenticationRepository = authenticationRepository,
            puntersRepository = puntersRepository,
            multiFactorAuthenticationService = new TestMultiFactorAuthenticationService {
              override def approveVerification(
                  verificationId: MultifactorVerificationId,
                  verificationCode: MultifactorVerificationCode): EitherT[Future, VerificationFailure, Unit] =
                EitherT.leftT(VerificationFailure.IncorrectVerificationCode)
            }).toAkkaHttp

          Post("/login-with-verification", requestBody) ~> RemoteAddress.LocalHost ~> testRoutes ~> check {
            status shouldEqual StatusCodes.Unauthorized
            assertErrorResponse(responseAs[Json], "incorrectMFAVerification")
          }
        }

        "fail if the credentials don't match, without a need for a password reset" in {
          val registeredUser = generateRegisteredUser()
          val punterId = PunterId.fromUuid(registeredUser.userId.value)
          val punterProfile = PunterDataGenerator.Api.withStatus(allowedStatus).copy(punterId = punterId)
          val puntersBoundedContext = new MemorizedTestPuntersContext(punterProfile) {
            override def incrementLoginFailureCounter(id: PunterId)(implicit
                ec: ExecutionContext): EitherT[Future, PunterProfileDoesNotExist, PasswordResetRequired] =
              super.incrementLoginFailureCounter(id).map(_ => PasswordResetRequired(false))
          }

          val testRoutes = buildRoutes(
            puntersBoundedContext = puntersBoundedContext,
            authenticationRepository = new TestAuthenticationRepository {
              override def findUser(userId: UserLookupId): Future[Option[RegisteredUserKeycloak]] =
                userId match {
                  case UserLookupId.ByUsername(_) =>
                    Future.successful(Some(registeredUser.toKeycloakUser()))
                  case _ => Future.successful(None)
                }
              override def signIn(username: domain.Username, password: MaybeValidPassword)
                  : EitherT[Future, Errors.UnauthorizedLoginError.type, UserTokenResponse] =
                EitherT.leftT(UnauthorizedLoginError)
            },
            puntersRepository = new InMemoryPuntersRepository() {
              override def findByPunterId(punterId: PunterId): OptionT[Future, Punter] =
                OptionT.fromOption(Some(registeredUser.toPunter()))
            }).toAkkaHttp

          Post("/login-with-verification", requestBody) ~> RemoteAddress.LocalHost ~> testRoutes ~> check {
            status shouldEqual StatusCodes.Unauthorized
            assertErrorResponse(responseAs[Json], "unauthorisedResponseDuringLogin")
          }
          And("the failure login counter should be incremented")
          puntersBoundedContext.loginFailureCounterIncrements.get() shouldBe List(punterId)
        }

        "fail if the credentials don't match, with a need for a password reset" in {
          val registeredUser = generateRegisteredUser()
          val punterId = PunterId.fromUuid(registeredUser.userId.value)
          val punterProfile = PunterDataGenerator.Api.withStatus(allowedStatus).copy(punterId = punterId)
          val puntersBoundedContext = new MemorizedTestPuntersContext(punterProfile) {
            override def incrementLoginFailureCounter(id: PunterId)(implicit
                ec: ExecutionContext): EitherT[Future, PunterProfileDoesNotExist, PasswordResetRequired] =
              super.incrementLoginFailureCounter(id).map(_ => PasswordResetRequired(true))
          }

          val testRoutes = buildRoutes(
            puntersBoundedContext = puntersBoundedContext,
            authenticationRepository = new TestAuthenticationRepository {
              override def findUser(userId: UserLookupId): Future[Option[RegisteredUserKeycloak]] =
                userId match {
                  case UserLookupId.ByUsername(_) =>
                    Future.successful(Some(registeredUser.toKeycloakUser()))
                  case _ => Future.successful(None)
                }
              override def signIn(username: domain.Username, password: MaybeValidPassword)
                  : EitherT[Future, Errors.UnauthorizedLoginError.type, UserTokenResponse] =
                EitherT.leftT(UnauthorizedLoginError)
            },
            puntersRepository = new InMemoryPuntersRepository() {
              override def findByPunterId(punterId: PunterId): OptionT[Future, Punter] =
                OptionT.fromOption(Some(registeredUser.toPunter()))
            }).toAkkaHttp

          Post("/login-with-verification", requestBody) ~> RemoteAddress.LocalHost ~> testRoutes ~> check {
            status shouldEqual StatusCodes.Unauthorized
            assertErrorResponse(responseAs[Json], "unauthorisedResponseRequiringPasswordReset")
          }
          And("the failure login counter should be incremented")
          puntersBoundedContext.loginFailureCounterIncrements.get() shouldBe List(punterId)
        }

        "fail when the IP header is not set" in {
          val registeredUser = generateRegisteredUser().withDetails(_.copy(twoFactorAuthEnabled = true))
          val testRoutes = buildRoutes(
            puntersBoundedContext =
              new PuntersContextProviderSuccess(PunterDataGenerator.Api.withStatus(allowedStatus)),
            authenticationRepository = new TestAuthenticationRepository() {
              override def findUser(userId: UserLookupId): Future[Option[RegisteredUserKeycloak]] =
                Future.successful(Some(registeredUser.toKeycloakUser()))
            },
            puntersRepository = new InMemoryPuntersRepository() {
              override def findByPunterId(punterId: PunterId): OptionT[Future, Punter] =
                OptionT.fromOption(Some(registeredUser.toPunter()))
            }).toAkkaHttp

          Post("/login", requestBody) ~> testRoutes ~> check {
            status shouldEqual StatusCodes.Conflict
            assertErrorResponse(responseAs[Json], "undefinedIPAddress")
          }
        }

        "succeed on the happy path" in {
          Given("an environment in which the user can sign in")
          val userToken = TestAuthenticationRepository.defaultUserTokenResponse
          val registeredUser = generateRegisteredUser()

          val authenticationRepository = new MemorizingTestAuthenticationRepository() {
            override def signIn(
                username: domain.Username,
                password: MaybeValidPassword): EitherT[Future, Errors.UnauthorizedLoginError.type, UserTokenResponse] =
              EitherT.safeRightT(userToken)

            override def findUser(userId: UserLookupId): Future[Option[RegisteredUserKeycloak]] =
              Future.successful(Some(registeredUser.toKeycloakUser()))
          }
          val puntersRepository = new InMemoryPuntersRepository() {
            override def findByPunterId(punterId: PunterId): OptionT[Future, Punter] =
              OptionT.fromOption(Some(registeredUser.toPunter()))
          }
          val deviceFingerprintsRepository = new InMemoryPunterDeviceFingerprintsRepository(clock)()
          val puntersBoundedContext =
            new PuntersContextProviderSuccess(PunterDataGenerator.Api.withStatus(allowedStatus))
          val testRoutes = buildRoutes(
            authenticationRepository = authenticationRepository,
            puntersRepository = puntersRepository,
            deviceFingerprintsRepository = deviceFingerprintsRepository,
            puntersBoundedContext = puntersBoundedContext).toAkkaHttp

          When("the request is made")
          Post("/login-with-verification", requestBody) ~> RemoteAddress.LocalHost ~> testRoutes ~> check {
            Then("the response status should be Ok")
            status shouldEqual StatusCodes.OK

            And("the response body should include the session")
            val response = responseAs[Json]
            response shouldHaveField ("sessionId", jsonFieldOfType[String])

            And("the response body should include the terms information")
            response shouldHaveField ("hasToAcceptTerms", jsonFieldOfType[Boolean])

            And("the response body should include the token")
            response shouldHaveField ("token", { tokenResponse =>
              tokenResponse shouldHaveField ("userId", jsonFieldOfType[String])
              tokenResponse shouldHaveField ("token", jsonFieldOfType[String])
              tokenResponse shouldHaveField ("expiresIn", jsonFieldOfType[Long])
              tokenResponse shouldHaveField ("refreshExpiresIn", jsonFieldOfType[Long])
              tokenResponse shouldHaveField ("refreshToken", jsonFieldOfType[String])
              tokenResponse shouldHaveField ("tokenType", jsonFieldOfType[String])
            })
          }
          And("should update lastSignIn information")
          puntersRepository.punterSettings.head._2.lastSignIn shouldBe a[Some[_]]
          And("should save device fingerprint")
          deviceFingerprintsRepository.deviceFingerprints should have size 1
        }

        "succeed and mark phone number as verified" in {
          Given("an environment in which the user can sign in")
          val userToken = TestAuthenticationRepository.defaultUserTokenResponse
          And("user has not verified new phone number")
          val registeredUser = generateRegisteredUser().withDetails(_.copy(isPhoneNumberVerified = false))

          val authenticationRepository = new MemorizingTestAuthenticationRepository() {
            override def signIn(
                username: domain.Username,
                password: MaybeValidPassword): EitherT[Future, Errors.UnauthorizedLoginError.type, UserTokenResponse] =
              EitherT.safeRightT(userToken)

            override def findUser(userId: UserLookupId): Future[Option[RegisteredUserKeycloak]] =
              Future.successful(Some(registeredUser.toKeycloakUser()))
          }
          val puntersRepository = new InMemoryPuntersRepository() {
            override def findByPunterId(punterId: PunterId): OptionT[Future, Punter] =
              OptionT.fromOption(Some(registeredUser.toPunter()))
          }

          val puntersBoundedContext =
            new PuntersContextProviderSuccess(PunterDataGenerator.Api.withStatus(allowedStatus))
          val testRoutes = buildRoutes(
            authenticationRepository = authenticationRepository,
            puntersRepository = puntersRepository,
            puntersBoundedContext = puntersBoundedContext).toAkkaHttp

          When("the request is made")
          Post("/login-with-verification", requestBody) ~> RemoteAddress.LocalHost ~> testRoutes ~> check {
            Then("the response status should be Ok")
            status shouldEqual StatusCodes.OK
          }
          And("should update verified phone number")
          puntersRepository.punterDetails.head._2.isPhoneNumberVerified shouldBe true

        }
    }
  }

  "POST /logout" when {
    val requestBody = parse(s""" { "sessionId": "${randomUUID().toString}" } """).get

    checkPermissions(Set(Active, InCoolOff, Unverified))(Post("logout", requestBody) ~> authHeader) { allowedStatus =>
      "fail if the request is not authenticated" in {
        Post("/logout", requestBody) ~> buildRoutesFor(allowedStatus) ~> check {
          status shouldEqual StatusCodes.Unauthorized
        }
      }

      "fail if the session is not the current one" in {
        val testRoutes = buildRoutes(puntersBoundedContext =
          new PuntersContextProviderSuccess(examplePunterProfileWith(allowedStatus)) {
            override def endSession(punterId: PunterId)(implicit
                ec: ExecutionContext): EitherT[Future, EndSessionError, EndedSession] =
              EitherT.leftT(SessionNotFound)
          }).toAkkaHttp
        Post("/logout", requestBody) ~> authHeader ~> testRoutes ~> check {
          status shouldEqual StatusCodes.NotFound
          assertErrorResponse(responseAs[Json], "sessionNotFound")
        }
      }

      "succeed if the request is authenticated and session matches" in {
        Post("/logout") ~> authHeader ~> buildRoutesFor(allowedStatus) ~> check {
          status shouldEqual StatusCodes.OK
        }
      }
    }
  }

  "POST /punters/self-exclude" when {

    def randomSelfExcludeRequestBody(): (SelfExclusionDuration, Json) = {
      val randomDuration = randomEnumValue[SelfExclusionDuration]()

      val durationRawString = randomDuration match {
        case SelfExclusionDuration.OneYear   => "ONE_YEAR"
        case SelfExclusionDuration.FiveYears => "FIVE_YEARS"
      }
      val requestBody =
        parse(s"""{
        "duration": "$durationRawString",
        "verificationId": "some_verification_id",
        "verificationCode": "123456"
      }""").get
      (randomDuration, requestBody)
    }

    val validBody = randomSelfExcludeRequestBody()._2
    checkPermissions(Set(Active, InCoolOff))(Post("punters/self-exclude", validBody) ~> authHeader) { allowedStatus =>
      "succeed in the happy path" in {
        val puntersBoundedContext = new MemorizedTestPuntersContext() {
          override def getPunterProfile(id: PunterId)(implicit
              ec: ExecutionContext): EitherT[Future, PunterProfileDoesNotExist, PunterProfile] = {
            super.getPunterProfile(id).map(_.copy(status = allowedStatus))
          }
        }
        val testRoutes = buildRoutes(puntersBoundedContext = puntersBoundedContext).toAkkaHttp

        val (duration, requestBody) = randomSelfExcludeRequestBody()

        Post("/punters/self-exclude", requestBody) ~> authHeader ~> testRoutes ~> check {
          status shouldEqual StatusCodes.OK
        }

        puntersBoundedContext.selfExclusionStarts.get() shouldBe List(
          (ThePunterId, SelfExclusionOrigin.Internal(duration)))
      }

      "fail if the request has no body" in {
        Post("/punters/self-exclude") ~> authHeader ~> underTest ~> check {
          status shouldEqual StatusCodes.BadRequest
        }
      }

      "fail if the multifactor verification is incorrect" in {
        val multiFactorAuthenticationService = new TestMultiFactorAuthenticationService() {
          override def approveVerification(
              verificationId: MultifactorVerificationId,
              verificationCode: MultifactorVerificationCode): EitherT[Future, VerificationFailure, Unit] =
            EitherT.leftT(VerificationFailure.IncorrectVerificationCode)
        }
        val testRoutes = buildRoutes(multiFactorAuthenticationService = multiFactorAuthenticationService).toAkkaHttp

        Post("/punters/self-exclude", randomSelfExcludeRequestBody()._2) ~> authHeader ~> testRoutes ~> check {
          status shouldEqual StatusCodes.BadRequest
          assertErrorResponse(responseAs[Json], "incorrectMFAVerification")
        }
      }

      "the multifactor verification is failed" should {
        "fail" in {
          val multiFactorAuthenticationService = new TestMultiFactorAuthenticationService() {
            override def approveVerification(
                verificationId: MultifactorVerificationId,
                verificationCode: MultifactorVerificationCode): EitherT[Future, VerificationFailure, Unit] = {
              EitherT.leftT(VerificationFailure.UnknownVerificationFailure)
            }
          }
          val testRoutes =
            buildRoutes(multiFactorAuthenticationService = multiFactorAuthenticationService).toAkkaHttp

          Post("/punters/self-exclude", randomSelfExcludeRequestBody()._2) ~> authHeader ~> testRoutes ~> check {
            status shouldEqual StatusCodes.BadRequest
            assertErrorResponse(responseAs[Json], "mfaVerificationFailure")
          }
        }
      }
    }
  }

  "POST /password/forgot" when {
    val requestBody = parse(s""" { "email": "someemail@test.com" } """).get

    "fail if the request has no body" in {
      Post("/password/forgot") ~> underTest ~> check {
        status shouldEqual StatusCodes.BadRequest
      }
    }

    "not send any email when no user is found for the email and still answer OK (to hide details)" in {
      val emailSender = new EmailSenderStub()
      val testRoutes = buildRoutes(
        emailSender = emailSender,
        authenticationRepository = new TestAuthenticationRepository() {
          override def findUser(userId: UserLookupId): Future[Option[RegisteredUserKeycloak]] =
            Future.successful(None)
        }).toAkkaHttp
      val devDomain = devDomainHeader("http://someurl.com")
      Post("/password/forgot", requestBody) ~> devDomain ~> testRoutes ~> check {
        status shouldEqual StatusCodes.OK
      }
      emailSender.shouldNotHaveSentAnyEmail()
    }

    checkPermissions(AllStatusesAllowed)(Post("password/forgot", requestBody) ~> authHeader) {
      case _ @(PunterStatus.Active | PunterStatus.SelfExcluded | PunterStatus.InCoolOff | PunterStatus.Unverified) =>
        "only send a password reset email when mfa is already enabled on the happy path" in {
          Given("A registered user and a valid request")
          val registeredUser = generateRegisteredUser().withDetails(_.copy(twoFactorAuthEnabled = true))
          val requestBody = parse(s""" { "email": "${registeredUser.details.email.value}" } """).get

          When("The request is made")
          val emailSender = new EmailSenderStub()
          val accountVerificationCodeRepository = new AccountVerificationCodeRepositoryStub(clock)()
          val authenticationRepository = new MemorizingTestAuthenticationRepository() {
            override def findUser(userId: UserLookupId): Future[Option[RegisteredUserKeycloak]] = {
              Future.successful(Some(registeredUser.toKeycloakUser()))
            }
          }
          val puntersRepository = new InMemoryPuntersRepository()
          awaitRight(
            puntersRepository.register(
              registeredUser.toPunter().focus(_.settings.mfaEnabled).replace(true),
              clock.currentOffsetDateTime()))

          val testRoutes = buildRoutes(
            authenticationRepository = authenticationRepository,
            puntersRepository = puntersRepository,
            emailSender = emailSender,
            accountVerificationCodeRepository = accountVerificationCodeRepository).toAkkaHttp

          val devDomain = devDomainHeader("http://someurl.com")
          Post("/password/forgot", requestBody) ~> devDomain ~> testRoutes ~> check {
            Then("Status should be OK")
            status shouldEqual StatusCodes.OK
          }

          Then("MFA status should NOT be updated")
          val punter = await(puntersRepository.findByPunterId(registeredUser.userId.asPunterId)).head
          punter.settings.mfaEnabled should ===(registeredUser.details.twoFactorAuthEnabled)

          Then("Email should be sent with the verification code just created")
          val accountVerificationCode =
            accountVerificationCodeRepository.accountVerificationCodes.values
              .find(_.userID == registeredUser.userId.value)
              .get
          emailSender.shouldContainEmailMessage(
            emailMessage =>
              emailMessage.recipient == registeredUser.details.email &&
              emailMessage.content.value
                .contains(s"${devDomain.value}/reset-password?token=${accountVerificationCode.urlEncodedId}"))
        }
      case punterStatus @ (PunterStatus.Suspended(_) | PunterStatus.Deleted) =>
        s"not send any email and still answer OK (to hide details)" in {
          val registeredUser = generateRegisteredUserKeycloak()
          val requestBody = parse(s""" { "email": "${registeredUser.details.email.value}" } """).get
          val emailSender = new EmailSenderStub()
          val testRoutes = buildRoutes(
            puntersBoundedContext = new PuntersContextProviderSuccess(PunterDataGenerator.Api.withStatus(punterStatus)),
            authenticationRepository = new TestAuthenticationRepository() {
              override def findUser(userId: UserLookupId): Future[Option[RegisteredUserKeycloak]] =
                userId match {
                  case UserLookupId.ByEmail(email) if email.value == registeredUser.details.email.value =>
                    Future.successful(Some(registeredUser))
                  case UserLookupId.ByUsername(username) if username.value == registeredUser.details.userName.value =>
                    Future.successful(Some(registeredUser))
                  case _ =>
                    Future.successful(None)
                }
            },
            emailSender = emailSender).toAkkaHttp
          val devDomain = devDomainHeader("http://someurl.com")
          Post("/password/forgot", requestBody) ~> devDomain ~> testRoutes ~> check {
            status shouldEqual StatusCodes.OK
          }
          emailSender.shouldNotHaveSentAnyEmail()
        }
    }
  }

  "POST /password/reset/:activationCodeId" when {
    "the request has no body" should {
      "fail" in {
        val requestUrl = s"/password/reset/${randomUUID().toString}"
        Post(requestUrl) ~> underTest ~> check {
          status shouldEqual StatusCodes.BadRequest
        }
      }
    }

    val passwordResetRequestBody =
      parse(s"""{
               |  "password": "TestTest123%%&&!!",
               |  "verificationId": "some_verification_id",
               |  "verificationCode": "123456"
               |} """.stripMargin).get

    "the verification code id does not match any existing code" should {
      "fail" in {
        val requestUrl = s"/password/reset/${randomUUID().toString}"
        Post(requestUrl, passwordResetRequestBody) ~> underTest ~> check {
          status shouldEqual StatusCodes.BadRequest
          assertErrorResponse(responseAs[Json], "invalidVerificationCode")
        }
      }
    }

    val verificationCode = AccountVerificationCode(
      id = DataGenerator.randomUUID(),
      userID = DataGenerator.randomUUID(),
      expiry = clock.currentOffsetDateTime() + 10.minutes)
    val code = verificationCode.id.toString

    def forbiddenRoutes(punterStatus: PunterStatus) =
      buildRoutes(
        puntersBoundedContext = new PuntersContextProviderSuccess(PunterDataGenerator.Api.withStatus(punterStatus)),
        authenticationRepository = new TestAuthenticationRepository() {
          override def findUser(userId: UserLookupId): Future[Option[RegisteredUserKeycloak]] =
            Future.successful(Some(generateRegisteredUserKeycloak()))
        },
        accountVerificationCodeRepository =
          new AccountVerificationCodeRepositoryStub(clock)(Map(verificationCode.id -> verificationCode))).toAkkaHttp

    checkPermissions(Set(Active))(
      Post(s"/password/reset/$code", passwordResetRequestBody) ~> authHeader,
      forbiddenRoutes) { allowedStatus =>
      "MFA verification is not passed" in {
        val multiFactorAuthenticationService = new TestMultiFactorAuthenticationService() {
          override def approveVerification(
              verificationId: MultifactorVerificationId,
              verificationCode: MultifactorVerificationCode): EitherT[Future, VerificationFailure, Unit] =
            EitherT.leftT(VerificationFailure.IncorrectVerificationCode)
        }
        val testRoutes = buildRoutes(
          multiFactorAuthenticationService = multiFactorAuthenticationService,
          accountVerificationCodeRepository =
            new AccountVerificationCodeRepositoryStub(clock)(Map(verificationCode.id -> verificationCode))).toAkkaHttp

        Post(s"/password/reset/$code", passwordResetRequestBody) ~> authHeader ~> testRoutes ~> check {
          Then("status should be BadRequest")
          status shouldEqual StatusCodes.BadRequest
          assertErrorResponse(responseAs[Json], "incorrectMFAVerification")
        }
      }

      "change the punter password on the happy path" in {
        Given("a request made over a valid verification code")
        val registeredUser = generateRegisteredUserKeycloak()
        val accountVerificationCode = AccountVerificationCode(
          id = DataGenerator.randomUUID(),
          userID = registeredUser.userId.value,
          expiry = clock.currentOffsetDateTime() + 10.minutes)
        val punterId = PunterId.fromUuid(accountVerificationCode.userID)
        val requestUrl = s"/password/reset/${accountVerificationCode.id.toString}"

        When("the request is made")
        val accountVerificationCodeRepository =
          new AccountVerificationCodeRepositoryStub(clock)(Map(accountVerificationCode.id -> accountVerificationCode))
        val authenticationRepository = new MemorizingTestAuthenticationRepository() {
          override def findUser(userId: UserLookupId): Future[Option[RegisteredUserKeycloak]] = {
            userId match {
              case UserLookupId.ByPunterId(value) if value == PunterId(registeredUser.userId.value.toString) =>
                Future.successful(Some(registeredUser))
              case _ =>
                Future.successful(None)
            }
          }
        }
        val puntersBoundedContext = new MemorizedTestPuntersContext() {
          override def getPunterProfile(id: PunterId)(implicit
              ec: ExecutionContext): EitherT[Future, PunterProfileDoesNotExist, PunterProfile] = {
            super.getPunterProfile(id).map(_.copy(status = allowedStatus))
          }
        }
        val emailSender = new EmailSenderStub()
        val testRoutes = buildRoutes(
          accountVerificationCodeRepository = accountVerificationCodeRepository,
          authenticationRepository = authenticationRepository,
          puntersBoundedContext = puntersBoundedContext,
          emailSender = emailSender).toAkkaHttp

        Post(requestUrl, passwordResetRequestBody) ~> testRoutes ~> check {
          Then("status should be NoContent")
          status shouldEqual StatusCodes.NoContent
        }
        And("the password should have been changed")
        authenticationRepository.passwordChanges shouldBe List(punterId)
        And("the confirmation email should have been sent")
        emailSender.shouldContainEmailMessage(emailMessage => emailMessage.recipient == registeredUser.details.email)
        And("the login context should have been reset")
        puntersBoundedContext.loginContextResets.get() shouldBe List(punterId)
      }

    }
  }

  "POST /password/change" when {

    "the request has no body" in {
      Post("/password/change") ~> authHeader ~> underTest ~> check {
        Then("status should be BadRequest")
        status shouldEqual StatusCodes.BadRequest
      }
    }

    val passwordChangeRequestBody =
      parse(s"""{
         |  "currentPassword": "OldOldOld123%%&&!!",
         |  "newPassword": "NewNewNew123%%&&!!",
         |  "verificationId": "some_verification_id",
         |  "verificationCode": "123456"
         |} """.stripMargin).get

    "the request is not authenticated" in {
      Post("/password/change", passwordChangeRequestBody) ~> underTest ~> check {
        Then("status should be Unauthorized")
        status shouldEqual StatusCodes.Unauthorized
      }
    }

    "the verification is not passed" in {
      val multiFactorAuthenticationService = new TestMultiFactorAuthenticationService() {
        override def approveVerification(
            verificationId: MultifactorVerificationId,
            verificationCode: MultifactorVerificationCode): EitherT[Future, VerificationFailure, Unit] =
          EitherT.leftT(VerificationFailure.IncorrectVerificationCode)
      }
      val testRoutes = buildRoutes(multiFactorAuthenticationService = multiFactorAuthenticationService).toAkkaHttp

      Post("/password/change", passwordChangeRequestBody) ~> authHeader ~> testRoutes ~> check {
        Then("status should be BadRequest")
        status shouldEqual StatusCodes.BadRequest
        assertErrorResponse(responseAs[Json], "incorrectMFAVerification")
      }
    }

    "the punter is not found" in {
      val authenticationRepository = new TestAuthenticationRepository() {
        override def findUser(userId: UserLookupId): Future[Option[RegisteredUserKeycloak]] = Future.successful(None)
      }
      val testRoutes = buildRoutes(authenticationRepository = authenticationRepository).toAkkaHttp

      Post("/password/change", passwordChangeRequestBody) ~> authHeader ~> testRoutes ~> check {
        Then("status should be BadRequest")
        status shouldEqual StatusCodes.BadRequest
        assertErrorResponse(responseAs[Json], "punterProfileDoesNotExist")
      }
    }

    "the current password does not match" in {
      val registeredUser =
        generateRegisteredUserKeycloak().copy(userId = domain.UserId(UUID.fromString(ThePunterId.value)))
      val authenticationRepository = new TestAuthenticationRepository() {
        override def findUser(userId: UserLookupId): Future[Option[RegisteredUserKeycloak]] =
          Future.successful(Some(registeredUser))

        override def signIn(
            username: domain.Username,
            password: MaybeValidPassword): EitherT[Future, Errors.UnauthorizedLoginError.type, UserTokenResponse] =
          EitherT.left(Future.successful(Errors.UnauthorizedLoginError))
      }
      val testRoutes = buildRoutes(authenticationRepository = authenticationRepository).toAkkaHttp

      Post("/password/change", passwordChangeRequestBody) ~> authHeader ~> testRoutes ~> check {
        Then("status should be BadRequest")
        status shouldEqual StatusCodes.BadRequest
        assertErrorResponse(responseAs[Json], "currentPasswordDoesNotMatchExisting")
      }
    }
    checkPermissions(Set(Active))(Post("/password/change", passwordChangeRequestBody) ~> authHeader) { allowedStatus =>
      "change the punter password on the happy path and send a password reset email" in {
        Given("A registered user and a valid request")
        val registeredUser = generateRegisteredUserKeycloak()

        When("The request is made")
        val emailSender = new EmailSenderStub()
        val accountVerificationCodeRepository = new AccountVerificationCodeRepositoryStub(clock)()
        val testRoutes = buildRoutes(
          puntersBoundedContext = new PuntersContextProviderSuccess(PunterDataGenerator.Api.withStatus(allowedStatus)),
          authenticationRepository = new TestAuthenticationRepository() {
            override def findUser(userId: UserLookupId): Future[Option[RegisteredUserKeycloak]] = {
              Future.successful(Some(registeredUser))
            }
          },
          emailSender = emailSender,
          accountVerificationCodeRepository = accountVerificationCodeRepository).toAkkaHttp

        Post("/password/change", passwordChangeRequestBody) ~> authHeader ~> testRoutes ~> check {
          Then("Status should be No Content")
          status shouldEqual StatusCodes.NoContent
        }

        Then("Email should be sent with the verification code just created")
        val now = clock.currentOffsetDateTime().format(dateFormatter)
        emailSender.shouldContainEmailMessage(
          emailMessage =>
            emailMessage.recipient == registeredUser.details.email &&
            emailMessage.content.value.contains(s"You've changed your password, operation time: ${now}"))
      }
    }
  }

  "POST /verification/request-by-verification-code/{email_verification_code}" when {

    "fail cause wrong account verification code" in {
      Given("an environment in which the user exists")
      val registeredUser = generateRegisteredUserKeycloak()
      val authenticationRepository = new TestAuthenticationRepository() {
        override def findUser(userId: UserLookupId): Future[Option[RegisteredUserKeycloak]] = {
          Future.successful(Some(registeredUser))
        }
      }
      Given("account verification code is wrong")
      val accountVerificationCodeRepository: AccountVerificationCodeRepository =
        new AccountVerificationCodeRepositoryStub(clock)()
      val wrongCode = DataGenerator.randomUUID()

      val testRoutes = buildRoutes(
        accountVerificationCodeRepository = accountVerificationCodeRepository,
        authenticationRepository = authenticationRepository).toAkkaHttp

      Post(s"/verification/request-by-verification-code/${wrongCode}") ~> testRoutes ~> check {
        Then("the status code of the response should be 'Ok'")
        status shouldEqual StatusCodes.BadRequest
        assertErrorResponse(responseAs[Json], "invalidVerificationCode")
      }
    }

    "fail when the punter exist, proper verification code, but wrong phone number" in {
      Given("an environment in which the user exists")
      val registeredUser = generateRegisteredUser()
      val authenticationRepository = new TestAuthenticationRepository() {
        override def findUser(userId: UserLookupId): Future[Option[RegisteredUserKeycloak]] =
          Future.successful(Some(registeredUser.toKeycloakUser()))
      }
      val puntersRepository = new InMemoryPuntersRepository() {
        override def findByPunterId(punterId: PunterId): OptionT[Future, Punter] =
          OptionT.fromOption(Some(registeredUser.toPunter()))
      }

      Given("account verification code is created before")
      val accountVerificationCodeRepository: AccountVerificationCodeRepository =
        new AccountVerificationCodeRepositoryStub(clock)()
      val code = await(accountVerificationCodeRepository.create(registeredUser.userId.value).map(_.id))
      Given("sending the verification code with wrong phone number")
      val multiFactorAuthenticationService = new TestMultiFactorAuthenticationService() {
        override def sendVerificationCode(mobilePhoneNumber: MobilePhoneNumber)
            : EitherT[Future, SendVerificationCodeFailure, MultifactorVerificationId] =
          EitherT.leftT(SendVerificationCodeFailure.InvalidPhoneNumber(mobilePhoneNumber.value))
      }

      val testRoutes = buildRoutes(
        multiFactorAuthenticationService = multiFactorAuthenticationService,
        accountVerificationCodeRepository = accountVerificationCodeRepository,
        authenticationRepository = authenticationRepository,
        puntersRepository = puntersRepository).toAkkaHttp

      Post(s"/verification/request-by-verification-code/${code}") ~> testRoutes ~> check {
        Then("the status code of the response should be 'BadRequest'")
        status shouldEqual StatusCodes.BadRequest
      }
    }

    "succeed when the punter exist but is not logged-in" in {
      Given("an environment in which the user exists")
      val registeredUser = generateRegisteredUser()
      val authenticationRepository = new TestAuthenticationRepository() {
        override def findUser(userId: UserLookupId): Future[Option[RegisteredUserKeycloak]] =
          Future.successful(Some(registeredUser.toKeycloakUser()))
      }
      val puntersRepository = new InMemoryPuntersRepository() {
        override def findByPunterId(punterId: PunterId): OptionT[Future, Punter] =
          OptionT.fromOption(Some(registeredUser.toPunter()))
      }

      Given("account verification code is created before")
      val accountVerificationCodeRepository = new AccountVerificationCodeRepositoryStub(clock)()
      val code = await(accountVerificationCodeRepository.create(registeredUser.userId.value).map(_.id))

      val testRoutes = buildRoutes(
        accountVerificationCodeRepository = accountVerificationCodeRepository,
        authenticationRepository = authenticationRepository,
        puntersRepository = puntersRepository).toAkkaHttp

      Post(s"/verification/request-by-verification-code/${code}") ~> testRoutes ~> check {
        Then("the status code of the response should be 'Ok'")
        status shouldEqual StatusCodes.OK

        And("the response should contain a verification id")
        val response = responseAs[Json]
        response shouldHaveField ("verificationId", jsonFieldOfType[String])
      }
    }
  }

  "POST /verification/request-by-phone" when {
    "fail when sending the verification code results in unknown failure" in {
      Given("an environment in which the user exists")
      val registeredUser = generateRegisteredUser().copy(userId = domain.UserId(UUID.fromString(ThePunterId.value)))
      val phoneNumber = registeredUser.details.phoneNumber
      val authenticationRepository = new TestAuthenticationRepository() {
        override def findUser(userId: UserLookupId): Future[Option[RegisteredUserKeycloak]] = {
          Future.successful(Some(registeredUser.toKeycloakUser()))
        }
      }
      val puntersRepository = new InMemoryPuntersRepository() {
        override def findByPunterId(punterId: PunterId): OptionT[Future, Punter] =
          OptionT.fromOption(Some(registeredUser.toPunter()))
      }
      Given("sending the verification code results in failure")
      val multiFactorAuthenticationService = new TestMultiFactorAuthenticationService() {
        override def sendVerificationCode(mobilePhoneNumber: MobilePhoneNumber)
            : EitherT[Future, SendVerificationCodeFailure, MultifactorVerificationId] =
          EitherT.leftT(SendVerificationCodeFailure.MaxSendAttemptsReached)
      }

      val testRoutes = buildRoutes(
        puntersBoundedContext =
          new PuntersContextProviderSuccess(PunterDataGenerator.Api.withStatus(PunterStatus.Unverified)),
        authenticationRepository = authenticationRepository,
        puntersRepository = puntersRepository,
        multiFactorAuthenticationService = multiFactorAuthenticationService).toAkkaHttp

      When("the request is made")
      val requestBody = parse(
        s""" { "phoneNumber": "${phoneNumber.value}", "deviceFingerprint": { "visitorId": "jp2gmd", "confidence" : "0.55" }} """).get
      Post("/verification/request-by-phone", requestBody) ~> authHeader ~> testRoutes ~> check {
        Then("the status code of the response should be a BadRequest")
        status shouldEqual StatusCodes.BadRequest

        And("the response should contain the expected error code")
        assertErrorResponse(responseAs[Json], "maxMFASendCodeAttemptsReached")
      }
    }

    "request a new verification on the happy path" in {
      Given("an environment in which the user exists")
      val registeredUser = generateRegisteredUser().copy(userId = domain.UserId(UUID.fromString(ThePunterId.value)))
      val phoneNumber = registeredUser.details.phoneNumber
      val testRoutes = buildRoutes(
        puntersBoundedContext =
          new PuntersContextProviderSuccess(PunterDataGenerator.Api.withStatus(PunterStatus.Unverified)),
        authenticationRepository = new TestAuthenticationRepository() {
          override def findUser(userId: UserLookupId): Future[Option[RegisteredUserKeycloak]] =
            Future.successful(Some(registeredUser.toKeycloakUser()))
        },
        puntersRepository = new InMemoryPuntersRepository() {
          override def findByPunterId(punterId: PunterId): OptionT[Future, Punter] =
            OptionT.fromOption(Some(registeredUser.toPunter()))
        }).toAkkaHttp

      When("the request is made")
      val requestBody = parse(
        s"""{ "phoneNumber": "${phoneNumber.value}", "deviceFingerprint": { "visitorId": "jp2gmd", "confidence" : "0.55" }}""").get
      Post("/verification/request-by-phone", requestBody) ~> authHeader ~> testRoutes ~> check {
        Then("the status code of the response should be 'Ok'")
        status shouldEqual StatusCodes.OK

        And("the response should contain a verification id")
        val response = responseAs[Json]
        response shouldHaveField ("verificationId", jsonFieldOfType[String])
      }
    }
  }

  "POST /verification/check" when {
    "request a new verification check" in {
      Given("an environment in which the user exists")
      val registeredUser = generateRegisteredUser().copy(userId = domain.UserId(UUID.fromString(ThePunterId.value)))
      val testRoutes = buildRoutes(
        puntersBoundedContext =
          new PuntersContextProviderSuccess(PunterDataGenerator.Api.withStatus(PunterStatus.Unverified)),
        authenticationRepository = new TestAuthenticationRepository() {
          override def findUser(userId: UserLookupId): Future[Option[RegisteredUserKeycloak]] =
            Future.successful(Some(registeredUser.toKeycloakUser()))
        },
        puntersRepository = new InMemoryPuntersRepository() {
          override def findByPunterId(punterId: PunterId): OptionT[Future, Punter] =
            OptionT.fromOption(Some(registeredUser.toPunter()))
        }).toAkkaHttp

      When("the request is made")
      val requestBody = parse(s"""{ "id": "verificationId", "code": "0000"}""").get
      Post("/verification/check", requestBody) ~> authHeader ~> testRoutes ~> check {
        Then("the status code of the response should be 'BadRequest'")
        status shouldEqual StatusCodes.BadRequest
      }
    }
  }

  "POST /verification/request" when {
    "the request is not authenticated" in {
      Post("/verification/request") ~> underTest ~> check {
        Then("Status should be Unauthorized")
        status shouldEqual StatusCodes.Unauthorized
      }
    }

    "the punter does not exist" in {
      val authenticationRepository = new TestAuthenticationRepository() {
        override def findUser(userId: UserLookupId): Future[Option[RegisteredUserKeycloak]] = Future.successful(None)
      }
      val testRoutes = buildRoutes(authenticationRepository = authenticationRepository).toAkkaHttp

      Post("/verification/request") ~> authHeader ~> testRoutes ~> check {
        Then("Status should be BadRequest")
        status shouldEqual StatusCodes.BadRequest
        assertErrorResponse(responseAs[Json], "punterProfileDoesNotExist")
      }
    }

    checkPermissions(Set(Active, InCoolOff, Unverified))(Post("/verification/request") ~> authHeader) { allowedStatus =>
      "fail when sending the verification code results in failure due to invalid phone number" in {
        Given("an environment in which the user exists")
        val registeredUser = generateRegisteredUser().copy(userId = domain.UserId(UUID.fromString(ThePunterId.value)))
        val authenticationRepository = new TestAuthenticationRepository() {
          override def findUser(userId: UserLookupId): Future[Option[RegisteredUserKeycloak]] = {
            Future.successful(Some(registeredUser.toKeycloakUser()))
          }
        }
        val puntersRepository = new InMemoryPuntersRepository() {
          override def findByPunterId(punterId: PunterId): OptionT[Future, Punter] =
            OptionT.fromOption(Some(registeredUser.toPunter()))
        }

        Given("sending the verification code results in failure")
        val multiFactorAuthenticationService = new TestMultiFactorAuthenticationService() {
          override def sendVerificationCode(mobilePhoneNumber: MobilePhoneNumber)
              : EitherT[Future, SendVerificationCodeFailure, MultifactorVerificationId] =
            EitherT.leftT(SendVerificationCodeFailure.InvalidPhoneNumber(mobilePhoneNumber.value))
        }

        val testRoutes = buildRoutes(
          puntersBoundedContext = new PuntersContextProviderSuccess(PunterDataGenerator.Api.withStatus(allowedStatus)),
          authenticationRepository = authenticationRepository,
          puntersRepository = puntersRepository,
          multiFactorAuthenticationService = multiFactorAuthenticationService).toAkkaHttp

        When("the request is made")
        Post("/verification/request") ~> authHeader ~> testRoutes ~> check {
          Then("the status code of the response should be an BadRequest")
          status shouldEqual StatusCodes.BadRequest

          And("the response should contain the expected error code")
          assertErrorResponse(responseAs[Json], "invalidPhoneNumber")
        }
      }

      "fail when sending the verification code results in failure due to max amount of mfa requests limitation" in {
        Given("an environment in which the user exists")
        val registeredUser = generateRegisteredUser().copy(userId = domain.UserId(UUID.fromString(ThePunterId.value)))
        val authenticationRepository = new TestAuthenticationRepository() {
          override def findUser(userId: UserLookupId): Future[Option[RegisteredUserKeycloak]] = {
            Future.successful(Some(registeredUser.toKeycloakUser()))
          }
        }
        val puntersRepository = new InMemoryPuntersRepository() {
          override def findByPunterId(punterId: PunterId): OptionT[Future, Punter] =
            OptionT.fromOption(Some(registeredUser.toPunter()))
        }
        Given("sending the verification code results in failure")
        val multiFactorAuthenticationService = new TestMultiFactorAuthenticationService() {
          override def sendVerificationCode(mobilePhoneNumber: MobilePhoneNumber)
              : EitherT[Future, SendVerificationCodeFailure, MultifactorVerificationId] =
            EitherT.leftT(SendVerificationCodeFailure.MaxSendAttemptsReached)
        }

        val testRoutes = buildRoutes(
          puntersBoundedContext = new PuntersContextProviderSuccess(PunterDataGenerator.Api.withStatus(allowedStatus)),
          authenticationRepository = authenticationRepository,
          puntersRepository = puntersRepository,
          multiFactorAuthenticationService = multiFactorAuthenticationService).toAkkaHttp

        When("the request is made")
        Post("/verification/request") ~> authHeader ~> testRoutes ~> check {
          Then("the status code of the response should be an InternalServerError")
          status shouldEqual StatusCodes.BadRequest

          And("the response should contain the expected error code")
          assertErrorResponse(responseAs[Json], "maxMFASendCodeAttemptsReached")
        }
      }

      "fail when sending the verification code results in unknown failure" in {
        Given("an environment in which the user exists")
        val registeredUser = generateRegisteredUser().copy(userId = domain.UserId(UUID.fromString(ThePunterId.value)))
        val authenticationRepository = new TestAuthenticationRepository() {
          override def findUser(userId: UserLookupId): Future[Option[RegisteredUserKeycloak]] = {
            Future.successful(Some(registeredUser.toKeycloakUser()))
          }
        }
        val puntersRepository = new InMemoryPuntersRepository() {
          override def findByPunterId(punterId: PunterId): OptionT[Future, Punter] =
            OptionT.fromOption(Some(registeredUser.toPunter()))
        }
        Given("sending the verification code results in failure")
        val multiFactorAuthenticationService = new TestMultiFactorAuthenticationService() {
          override def sendVerificationCode(mobilePhoneNumber: MobilePhoneNumber)
              : EitherT[Future, SendVerificationCodeFailure, MultifactorVerificationId] =
            EitherT.leftT(SendVerificationCodeFailure.MaxSendAttemptsReached)
        }

        val testRoutes = buildRoutes(
          puntersBoundedContext = new PuntersContextProviderSuccess(PunterDataGenerator.Api.withStatus(allowedStatus)),
          authenticationRepository = authenticationRepository,
          puntersRepository = puntersRepository,
          multiFactorAuthenticationService = multiFactorAuthenticationService).toAkkaHttp

        When("the request is made")
        Post("/verification/request") ~> authHeader ~> testRoutes ~> check {
          Then("the status code of the response should be a BadRequest")
          status shouldEqual StatusCodes.BadRequest

          And("the response should contain the expected error code")
          assertErrorResponse(responseAs[Json], "maxMFASendCodeAttemptsReached")
        }
      }

      "request a new verification on the happy path" in {
        Given("an environment in which the user exists")
        val registeredUser = generateRegisteredUser().copy(userId = domain.UserId(UUID.fromString(ThePunterId.value)))
        val testRoutes = buildRoutes(
          puntersBoundedContext = new PuntersContextProviderSuccess(PunterDataGenerator.Api.withStatus(allowedStatus)),
          authenticationRepository = new TestAuthenticationRepository() {
            override def findUser(userId: UserLookupId): Future[Option[RegisteredUserKeycloak]] =
              Future.successful(Some(registeredUser.toKeycloakUser()))
          },
          puntersRepository = new InMemoryPuntersRepository() {
            override def findByPunterId(punterId: PunterId): OptionT[Future, Punter] =
              OptionT.fromOption(Some(registeredUser.toPunter()))
          }).toAkkaHttp

        When("the request is made")
        Post("/verification/request") ~> authHeader ~> testRoutes ~> check {
          Then("the status code of the response should be 'Ok'")
          status shouldEqual StatusCodes.OK

          And("the response should contain a verification id")
          val response = responseAs[Json]
          response shouldHaveField ("verificationId", jsonFieldOfType[String])
        }
      }
    }
  }

  "PUT /account/activate/:token" when {
    "the verification code id does not match any existing code" in {
      val requestUrl = s"/account/activate/${randomUUID().toString}"
      Put(requestUrl) ~> underTest ~> check {
        Then("Status should be BadRequest")
        status shouldEqual StatusCodes.BadRequest
        assertErrorResponse(responseAs[Json], "invalidVerificationCode")
      }
    }

    val verificationCode = AccountVerificationCode(
      id = DataGenerator.randomUUID(),
      userID = DataGenerator.randomUUID(),
      expiry = clock.currentOffsetDateTime() + 10.minutes)
    val code = verificationCode.id.toString

    def forbiddenRoutes(punterStatus: PunterStatus) = {
      val accountVerificationCodeRepository =
        new AccountVerificationCodeRepositoryStub(clock)(Map(verificationCode.id -> verificationCode))
      buildRoutes(
        puntersBoundedContext = new PuntersContextProviderSuccess(PunterDataGenerator.Api.withStatus(punterStatus)),
        accountVerificationCodeRepository = accountVerificationCodeRepository).toAkkaHttp
    }

    checkPermissions(Set(Active))(Put(s"/account/activate/$code"), forbiddenRoutes) { allowedStatus =>
      "activate the user account on the happy path" in {
        Given("A request made over a valid verification code")
        val accountVerificationCode = AccountVerificationCode(
          id = DataGenerator.randomUUID(),
          userID = DataGenerator.randomUUID(),
          expiry = clock.currentOffsetDateTime() + 10.minutes)
        val requestUrl = s"/account/activate/${accountVerificationCode.id.toString}"
        val punterSettings = generatePunterSettings().copy(isAccountVerified = false)
        val punter =
          generatePunter().copy(punterId = PunterId.fromUuid(accountVerificationCode.userID), settings = punterSettings)

        val authenticationRepository = new MemorizingTestAuthenticationRepository()
        val puntersRepository = new InMemoryPuntersRepository() {
          override def findByPunterId(punterId: PunterId): OptionT[Future, Punter] = {
            OptionT.pure(punter)
          }
        }
        val accountVerificationCodeRepository =
          new AccountVerificationCodeRepositoryStub(clock)(Map(accountVerificationCode.id -> accountVerificationCode))
        val testRoutes = buildRoutes(
          puntersBoundedContext = new PuntersContextProviderSuccess(PunterDataGenerator.Api.withStatus(allowedStatus)),
          accountVerificationCodeRepository = accountVerificationCodeRepository,
          puntersRepository = puntersRepository,
          authenticationRepository = authenticationRepository).toAkkaHttp

        When("The request is made")
        Put(requestUrl) ~> testRoutes ~> check {
          Then("Status should be OK")
          status shouldEqual StatusCodes.OK
        }
        Then("The punter should be verified")
        authenticationRepository.emailVerifications shouldBe List(PunterId.fromUuid(accountVerificationCode.userID))
        puntersRepository.punterSettings.head._2.isAccountVerified shouldBe true
      }
    }
  }

  "POST /token/refresh" when {
    "no body is passed in the request" should {
      "respond with BadRequest" in {
        Post("/token/refresh") ~> underTest ~> check {
          status shouldEqual StatusCodes.BadRequest
        }
      }
    }
    checkPermissions(AllStatusesAllowed)(Post("/token/refresh"), buildRoutesFor) { allowedStatus =>
      "not refresh the token when an invalid refresh token is provided" in {
        Given("an existing user")
        val registeredUser = generateRegisteredUser()
        val punterId = PunterId(registeredUser.userId.value.toString)
        Given("a token that should be created when it authenticates")
        val userTokenResponse =
          TestAuthenticationRepository.defaultUserTokenResponse.copy(userId = punterId.value)

        When("an incorrect request is made")
        val refreshTokenInstance = RefreshToken("some_refresh_token")

        val authenticationRepository = new TestAuthenticationRepository() {
          override def refreshToken(
              token: RefreshToken): EitherT[Future, Errors.InvalidRefreshToken.type, UserTokenResponse] = {
            if (token == refreshTokenInstance) {
              EitherT.safeRightT(userTokenResponse)
            } else {
              EitherT.leftT(Errors.InvalidRefreshToken)
            }
          }
        }
        val testRoutes = buildRoutes(
          puntersBoundedContext = new PuntersContextProviderSuccess(PunterDataGenerator.Api.withStatus(allowedStatus)),
          authenticationRepository = authenticationRepository).toAkkaHttp

        val invalidRequestBody = parse(s""" { "refresh_token": "${randomString()}" } """).get
        Post("/token/refresh", invalidRequestBody) ~> testRoutes ~> check {
          Then("status should be Unauthorized")
          status shouldEqual StatusCodes.Unauthorized

          And("the correct error code should be reported")
          assertErrorResponse(responseAs[Json], "invalidRefreshToken")
        }
      }

      "refresh the token and return a new auth token on the happy path" in {
        Given("an existing user")
        val registeredUser = generateRegisteredUser()
        val punterId = PunterId(registeredUser.userId.value.toString)
        Given("a token that should be created when it authenticates")
        val userTokenResponse =
          TestAuthenticationRepository.defaultUserTokenResponse.copy(userId = punterId.value)

        When("a correct request is made")
        val refreshTokenInstance = RefreshToken("some_refresh_token")

        val authenticationRepository = new TestAuthenticationRepository() {
          override def refreshToken(
              token: RefreshToken): EitherT[Future, Errors.InvalidRefreshToken.type, UserTokenResponse] = {
            if (token == refreshTokenInstance) {
              EitherT.safeRightT(userTokenResponse)
            } else {
              EitherT.leftT(Errors.InvalidRefreshToken)
            }
          }
        }
        val testRoutes = buildRoutes(
          puntersBoundedContext = new PuntersContextProviderSuccess(PunterDataGenerator.Api.withStatus(allowedStatus)),
          authenticationRepository = authenticationRepository).toAkkaHttp

        val validRequestBody = parse(s""" { "refresh_token": "${refreshTokenInstance.value}" } """).get
        Post("/token/refresh", validRequestBody) ~> testRoutes ~> check {
          Then("status should be OK")
          status shouldEqual StatusCodes.OK

          Then("response should have a token")
          val response = responseAs[Json]
          response shouldHaveField ("token", { tokenResponse =>
            tokenResponse shouldHaveField ("userId", jsonFieldOfType[String])
            tokenResponse shouldHaveField ("token", jsonFieldOfType[String])
            tokenResponse shouldHaveField ("expiresIn", jsonFieldOfType[Long])
            tokenResponse shouldHaveField ("refreshExpiresIn", jsonFieldOfType[Long])
            tokenResponse shouldHaveField ("refreshToken", jsonFieldOfType[String])
            tokenResponse shouldHaveField ("tokenType", jsonFieldOfType[String])
          })
        }
      }
    }
  }

  "GET /terms" when {
    checkPermissions(AllStatusesAllowed)(Get("terms"), buildRoutesFor) { allowedStatus =>
      val termsAndConditionsRepository = new TermsAndConditionsRepositoryMock()
      "return the current terms version and content" in {

        val testRoutes = buildRoutes(
          puntersBoundedContext = new PuntersContextProviderSuccess(PunterDataGenerator.Api.withStatus(allowedStatus)),
          termsAndConditionsRepository = termsAndConditionsRepository).toAkkaHttp

        Get("/terms") ~> testRoutes ~> check {
          status shouldEqual StatusCodes.OK

          val response = responseAs[Json]
          response shouldHaveField ("version", jsonFieldOfTypeContaining[Int](0))
          response shouldHaveField ("content", jsonFieldOfTypeContaining[String](
            "these are our terms, like them or leave"))
        }
      }
    }
  }

  "PUT /terms/accept" when {
    val requestBody = parse(s""" { "version": 1 } """).get
    checkPermissions(Set(Active))(Put("/terms/accept", requestBody) ~> authHeader) { allowedStatus =>
      "fail if no body is passed" in {
        Put("/terms/accept") ~> authHeader ~> underTest ~> check {
          status shouldEqual StatusCodes.BadRequest
        }
      }

      "fail if no authentication header is passed" in {
        val requestBody = parse(s""" { "version": 2 } """).get
        Put("/terms/accept", requestBody) ~> buildRoutesFor(allowedStatus) ~> check {
          status shouldEqual StatusCodes.Unauthorized
        }
      }

      "fail if the accepted version is not the latest" in {
        Given("A request with version lower than the accepted one")
        val requestBody = parse(s""" { "version": 2 } """).get
        val currentVersion = CurrentTermsVersion(3)
        val testRoutes =
          buildRoutes(
            puntersBoundedContext =
              new PuntersContextProviderSuccess(PunterDataGenerator.Api.withStatus(allowedStatus)),
            termsAndConditionsRepository = new TermsAndConditionsRepositoryMock() {
              override def getCurrentTerms(): Future[Terms] = {
                Future {
                  Terms(currentVersion, generateTermsContent(), generateTermsDayThreshold())
                }
              }
            }).toAkkaHttp

        When("The request is made")
        Put("/terms/accept", requestBody) ~> authHeader ~> testRoutes ~> check {
          Then("The response should be failed with 'BadRequest'")
          status shouldEqual StatusCodes.BadRequest

          And("The correct error code should be reported")
          assertErrorResponse(responseAs[Json], "acceptedTermsVersionWasNotTheLatest")
        }
      }

      "fail if the user does not exist" in {
        Given("A request accepting the current terms version")
        val requestBody = parse(s""" { "version": 5 } """).get
        val currentVersion = CurrentTermsVersion(5)

        And("An environment in which the user does not exist")
        val authenticationRepository = new TestAuthenticationRepository() {
          override def findUser(userId: UserLookupId): Future[Option[RegisteredUserKeycloak]] = Future.successful(None)
        }
        val testRoutes =
          buildRoutes(
            puntersBoundedContext =
              new PuntersContextProviderSuccess(PunterDataGenerator.Api.withStatus(allowedStatus)),
            termsAndConditionsRepository = new TermsAndConditionsRepositoryMock() {
              override def getCurrentTerms(): Future[Terms] = {
                Future {
                  Terms(currentVersion, generateTermsContent(), generateTermsDayThreshold())
                }
              }
            },
            authenticationRepository = authenticationRepository).toAkkaHttp

        When("The request is made")
        Put("/terms/accept", requestBody) ~> authHeader ~> testRoutes ~> check {
          Then("The response should be failed with 'BadRequest'")
          status shouldEqual StatusCodes.BadRequest

          And("The correct error code should be reported")
          assertErrorResponse(responseAs[Json], "punterProfileDoesNotExist")
        }
      }

      "update the user terms agreement on the happy path" in {
        Given("A request accepting the current terms version")
        val requestBody = parse(s""" { "version": 5 } """).get
        val currentVersion = CurrentTermsVersion(5)

        And("An environment in which the user does exist")
        val punter =
          generatePunter().copy(punterId = ThePunterId)
        val puntersRepository =
          InMemoryPuntersRepository.withRegisteredPunters(clock.currentOffsetDateTime().minusDays(1), punter)
        val testRoutes =
          buildRoutes(
            puntersBoundedContext =
              new PuntersContextProviderSuccess(PunterDataGenerator.Api.withStatus(allowedStatus)),
            termsAndConditionsRepository = new TermsAndConditionsRepositoryMock() {
              override def getCurrentTerms(): Future[Terms] = {
                Future {
                  Terms(currentVersion, generateTermsContent(), generateTermsDayThreshold())
                }
              }
            },
            puntersRepository = puntersRepository).toAkkaHttp

        When("The request is made")
        Put("/terms/accept", requestBody) ~> authHeader ~> testRoutes ~> check {
          Then("The response status should be Ok")
          status shouldEqual StatusCodes.OK
        }
        And("The terms agreement needs to be correctly updated")
        puntersRepository.punterSettings(ThePunterId).termsAgreement.version.value shouldBe currentVersion.value
      }
    }
  }

  "GET /profile/me" when {
    "request doesn't have authentication header" in {
      Get("/profile/me") ~> underTest ~> check {
        Then("status should be Unauthorized")
        status shouldEqual StatusCodes.Unauthorized
      }
    }

    "user does not exist in the punters bounded context" in {
      val puntersBoundedContext = new PuntersContextProviderSuccess() {
        override def getPunterProfile(id: PunterId)(implicit
            ec: ExecutionContext): EitherT[Future, PunterProfileDoesNotExist, PunterProfile] = {
          EitherT.leftT[Future, PunterProfile](PuntersBoundedContext.PunterProfileDoesNotExist(id))
        }
      }
      val testRoutes = buildRoutes(puntersBoundedContext = puntersBoundedContext).toAkkaHttp

      Get("/profile/me") ~> authHeader ~> testRoutes ~> check {
        status shouldEqual StatusCodes.Forbidden
        assertErrorResponse(responseAs[Json], "punterProfileDoesNotExist")
      }
    }

    "user does not exist in the authentication repository" in {
      Given(
        "An environment in which the user exists in the punter bounded" +
        " context but doesn't exist in the authentication repository context")
      val punterProfile = PunterDataGenerator.Api.active()
      val puntersBoundedContext = new PuntersContextProviderSuccess() {
        override def getPunterProfile(id: PunterId)(implicit
            ec: ExecutionContext): EitherT[Future, PunterProfileDoesNotExist, PunterProfile] =
          EitherT.safeRightT(punterProfile)
      }
      val authenticationRepository = new TestAuthenticationRepository() {
        override def findUser(userId: UserLookupId): Future[Option[RegisteredUserKeycloak]] =
          Future.successful(None)
      }
      val testRoutes = buildRoutes(
        puntersBoundedContext = puntersBoundedContext,
        authenticationRepository = authenticationRepository).toAkkaHttp

      When("The http request is made")
      Get("/profile/me") ~> authHeader ~> testRoutes ~> check {
        Then("Status should be BadRequest")
        status shouldEqual StatusCodes.BadRequest

        And("The error code should match the expected one")
        assertErrorResponse(responseAs[Json], "punterProfileDoesNotExist")
      }
    }

    checkPermissions(Set(Active, InCoolOff, Unverified))(Get("/profile/me") ~> authHeader) { allowedStatus =>
      "fail when the wallet does not exist" in {
        Given("An environment in which the wallet does not exist")
        val punterProfile = PunterDataGenerator.Api.withStatus(allowedStatus)
        val registeredUser =
          generateRegisteredUser().copy(userId = domain.UserId(UUID.fromString(ThePunterId.value)))
        val puntersBoundedContext = new PuntersContextProviderSuccess() {
          override def getPunterProfile(id: PunterId)(implicit
              ec: ExecutionContext): EitherT[Future, PunterProfileDoesNotExist, PunterProfile] =
            EitherT.safeRightT(punterProfile)
        }
        val authenticationRepository: TestAuthenticationRepository =
          testAuthenticationRepositoryWithFindUser(registeredUser.toKeycloakUser())
        val puntersRepository = new InMemoryPuntersRepository()
        puntersRepository.startPunterRegistration(registeredUser.toPunter(), clock.currentOffsetDateTime())
        val walletsBoundedContext = new WalletContextProviderSuccess(clock) {
          override def findResponsibilityCheckStatus(walletId: WalletId)(implicit ec: ExecutionContext)
              : EitherT[Future, WalletsBoundedContextProtocol.WalletNotFoundError, ResponsibilityCheckStatus] =
            EitherT.leftT(WalletsBoundedContextProtocol.WalletNotFoundError(walletId))
        }
        val testRoutes = buildRoutes(
          puntersBoundedContext = puntersBoundedContext,
          authenticationRepository = authenticationRepository,
          puntersRepository = puntersRepository,
          walletsBoundedContext = walletsBoundedContext).toAkkaHttp

        When("The http request is made")
        Get("/profile/me") ~> authHeader ~> testRoutes ~> check {
          Then("Status should be BadRequest")
          status shouldEqual StatusCodes.BadRequest

          And("The error code should match the expected one")
          assertErrorResponse(responseAs[Json], "walletNotFound")
        }
      }

      "retrieve the user profile on the happy path" in {
        Given("An environment in which the user exists in all the relevant contexts")
        val coolOffStatus =
          if (allowedStatus == InCoolOff)
            Some(CoolOffStatus(generateCoolOffPeriod(), randomEnumValue[CoolOffCause]()))
          else None
        val punterProfile = PunterDataGenerator.Api.withStatus(allowedStatus, coolOffStatus)
        val registeredUser =
          generateRegisteredUser().copy(
            userId = domain.UserId(UUID.fromString(ThePunterId.value)),
            lastSignIn = Some(
              LastSignInData(
                SignInTimestamp(new FakeHardcodedClock().currentOffsetDateTime()),
                IpAddress("127.0.0.1"))))
        val puntersBoundedContext = new PuntersContextProviderSuccess() {
          override def getPunterProfile(id: PunterId)(implicit
              ec: ExecutionContext): EitherT[Future, PunterProfileDoesNotExist, PunterProfile] =
            EitherT.safeRightT(punterProfile)
        }
        val authenticationRepository: TestAuthenticationRepository =
          testAuthenticationRepositoryWithFindUser(registeredUser.toKeycloakUser())
        val puntersRepository = new InMemoryPuntersRepository()
        puntersRepository.startPunterRegistration(registeredUser.toPunter(), clock.currentOffsetDateTime())
        val walletsBoundedContext = new WalletContextProviderSuccess(clock) {
          override def findResponsibilityCheckStatus(walletId: WalletId)(implicit ec: ExecutionContext)
              : EitherT[Future, WalletsBoundedContextProtocol.WalletNotFoundError, ResponsibilityCheckStatus] =
            EitherT.safeRightT(ResponsibilityCheckStatus.NeedsToBeAccepted)
        }
        val testRoutes = buildRoutes(
          puntersBoundedContext = puntersBoundedContext,
          authenticationRepository = authenticationRepository,
          puntersRepository = puntersRepository,
          walletsBoundedContext = walletsBoundedContext).toAkkaHttp

        When("The http request is made")
        Get("/profile/me") ~> authHeader ~> testRoutes ~> check {
          Then("Status should be Ok")
          status shouldEqual StatusCodes.OK

          And("The response should have the specific expected fields, and no more")
          val response = responseAs[Json]
          def allowedStatusCoolOff() = if (allowedStatus == InCoolOff) List("coolOff") else Nil
          val responseFields = allowedStatusCoolOff() ++ List(
              "userId",
              "username",
              "name",
              "address",
              "email",
              "phoneNumber",
              "dateOfBirth",
              "gender",
              "twoFactorAuthEnabled",
              "depositLimits",
              "stakeLimits",
              "sessionLimits",
              "communicationPreferences",
              "bettingPreferences",
              "status",
              "richStatus",
              "terms",
              "hasToAcceptTerms",
              "signUpDate",
              "lastSignIn",
              "hasToAcceptResponsibilityCheck",
              "ssn")
          response.asObject
            .map(_.keys.toList.sorted)
            .getOrElse(List()) should contain theSameElementsAs responseFields.sorted

          And("The response should match the expected format")
          response shouldHaveField ("lastSignIn", jsonFieldOfType[String])
          response shouldHaveField ("userId", jsonFieldOfType[String])
          response shouldHaveField ("signUpDate", jsonFieldOfType[String])
          response shouldHaveField ("username", jsonFieldOfType[String])
          response shouldHaveField ("name", { name =>
            name shouldHaveField ("title", jsonFieldOfType[String])
            name shouldHaveField ("firstName", jsonFieldOfType[String])
            name shouldHaveField ("lastName", jsonFieldOfType[String])
          })
          response shouldHaveField ("address", { address =>
            address shouldHaveField ("addressLine", jsonFieldOfType[String])
            address shouldHaveField ("city", jsonFieldOfType[String])
            address shouldHaveField ("state", jsonFieldOfType[String])
            address shouldHaveField ("zipcode", jsonFieldOfType[String])
            address shouldHaveField ("country", jsonFieldOfType[String])
          })
          response shouldHaveField ("email", jsonFieldOfType[String])
          response shouldHaveField ("phoneNumber", jsonFieldOfType[String])
          response shouldHaveField ("dateOfBirth", { dateOfBirth =>
            dateOfBirth shouldHaveField ("day", jsonFieldOfType[Int])
            dateOfBirth shouldHaveField ("month", jsonFieldOfType[Int])
            dateOfBirth shouldHaveField ("year", jsonFieldOfType[Int])
          })
          response shouldHaveField ("depositLimits", { depositLimits =>
            depositLimits shouldHaveField ("daily", havingUnlimitedCurrentLimit)
            depositLimits shouldHaveField ("weekly", havingUnlimitedCurrentLimit)
            depositLimits shouldHaveField ("monthly", havingUnlimitedCurrentLimit)
          })
          response shouldHaveField ("stakeLimits", { stakeLimits =>
            stakeLimits shouldHaveField ("daily", havingUnlimitedCurrentLimit)
            stakeLimits shouldHaveField ("weekly", havingUnlimitedCurrentLimit)
            stakeLimits shouldHaveField ("monthly", havingUnlimitedCurrentLimit)
          })
          response shouldHaveField ("sessionLimits", { sessionLimits =>
            sessionLimits shouldHaveField ("daily", havingCurrentAndNextLimit)
            sessionLimits shouldHaveField ("weekly", havingCurrentAndNextLimit)
            sessionLimits shouldHaveField ("monthly", havingCurrentAndNextLimit)
          })
          response shouldHaveField ("communicationPreferences", { communicationPreferences =>
            communicationPreferences shouldHaveField ("announcements", jsonFieldOfType[Boolean])
            communicationPreferences shouldHaveField ("promotions", jsonFieldOfType[Boolean])
            communicationPreferences shouldHaveField ("subscriptionUpdates", jsonFieldOfType[Boolean])
          })
          response shouldHaveField ("bettingPreferences", { bettingPreferences =>
            bettingPreferences shouldHaveField ("autoAcceptBetterOdds", jsonFieldOfType[Boolean])
          })
          response shouldHaveField ("status", jsonFieldOfType[String])
          response shouldHaveField ("terms", { terms =>
            terms shouldHaveField ("version", jsonFieldOfType[Int])
            terms shouldHaveField ("acceptedAt", jsonFieldOfType[String])
          })
          response shouldHaveField ("hasToAcceptTerms", jsonFieldOfType[Boolean])
          response shouldHaveField ("hasToAcceptResponsibilityCheck", jsonFieldOfTypeContaining[Boolean](true))
          if (allowedStatus == InCoolOff) {
            response shouldHaveField ("coolOff", { coolOff =>
              coolOff shouldHaveField ("period", { period =>
                period shouldHaveField ("startTime", jsonFieldOfType[String])
                period shouldHaveField ("endTime", jsonFieldOfType[String])
              })
              coolOff shouldHaveField ("cause", jsonFieldOfType[String])
            })
          } else {
            response shouldNotHaveField ("coolOff")
          }
        }
      }
    }
  }

  "PUT /profile/details" when {
    "the request has no body" in {
      Put("/profile/details") ~> authHeader ~> underTest ~> check {
        Then("Status should be BadRequest")
        status shouldEqual StatusCodes.BadRequest
      }
    }

    val newUserPersonalDetails = generateUserPersonalDetails()
    val requestBody =
      parse(s"""{
         |  "name": {
         |    "title": "${newUserPersonalDetails.name.title.value}",
         |    "firstName": "${newUserPersonalDetails.name.firstName.value}",
         |    "lastName": "${newUserPersonalDetails.name.lastName.value}"
         |  },
         |  "address": {
         |    "addressLine": "${newUserPersonalDetails.address.addressLine.value}",
         |    "city": "${newUserPersonalDetails.address.city.value}",
         |    "state": "${newUserPersonalDetails.address.state.value}",
         |    "zipcode": "${newUserPersonalDetails.address.zipcode.value}",
         |    "country": "${newUserPersonalDetails.address.country.value}"
         |  },
         |  "phoneNumber": "${newUserPersonalDetails.phoneNumber.value}"
         |} """.stripMargin).get

    "the request has no auth header" in {
      Put("/profile/details", requestBody) ~> underTest ~> check {
        Then("Status should be Unauthorized")
        status shouldEqual StatusCodes.Unauthorized
      }
    }

    checkPermissions(Set(Active))(Put("/profile/details", requestBody) ~> authHeader) { allowedStatus =>
      "fail if the user does not exist" in {
        Given("An environment in which the user does not exist")
        val authenticationRepository = new TestAuthenticationRepository() {
          override def findUser(userId: UserLookupId): Future[Option[RegisteredUserKeycloak]] = Future.successful(None)
        }
        val routes = buildRoutes(
          puntersBoundedContext = new PuntersContextProviderSuccess(PunterDataGenerator.Api.withStatus(allowedStatus)),
          authenticationRepository = authenticationRepository).toAkkaHttp

        When("We make the http request")
        Put("/profile/details", requestBody) ~> authHeader ~> routes ~> check {
          Then("Status should be BadRequest")
          status shouldEqual StatusCodes.BadRequest

          And("The error code returned should match the expected one")
          assertErrorResponse(responseAs[Json], "punterProfileDoesNotExist")
        }
      }

      "update the user details on the happy path" in {
        Given("An environment in which the user exists")
        val originalUser = generateRegisteredUser().copy(userId = domain.UserId(UUID.fromString(ThePunterId.value)))
        val authenticationRepository = new MemorizingTestAuthenticationRepository() {
          override def findUser(userId: UserLookupId): Future[Option[RegisteredUserKeycloak]] =
            Future.successful(Some(originalUser.toKeycloakUser()))
        }
        val puntersRepository =
          InMemoryPuntersRepository.withRegisteredPunters(clock.currentOffsetDateTime(), originalUser.toPunter())
        val routes = buildRoutes(
          puntersBoundedContext = new PuntersContextProviderSuccess(PunterDataGenerator.Api.withStatus(allowedStatus)),
          authenticationRepository = authenticationRepository,
          puntersRepository = puntersRepository).toAkkaHttp

        When("We make the http request")
        Put("/profile/details", requestBody) ~> authHeader ~> routes ~> check {
          Then("Status should be NoContent")
          status shouldEqual StatusCodes.NoContent
        }

        And("punters repository should be updated")
        val punterDetails = await(puntersRepository.findByPunterId(originalUser.userId.asPunterId)).get.details
        punterDetails.name should ===(newUserPersonalDetails.name)
        punterDetails.address should ===(newUserPersonalDetails.address)
        punterDetails.phoneNumber should ===(newUserPersonalDetails.phoneNumber)
      }
    }
  }

  "PUT /profile/preferences" when {
    "the request has no body" in {
      Put("/profile/preferences") ~> authHeader ~> underTest ~> check {
        Then("Status should be BadRequest")
        status shouldEqual StatusCodes.BadRequest
      }
    }

    val newUserPreferences = generateUserPreferences()
    val requestBody =
      Json.obj(
        "communicationPreferences" -> Json.obj(
          "announcements" -> newUserPreferences.communicationPreferences.announcements.asJson,
          "promotions" -> newUserPreferences.communicationPreferences.promotions.asJson,
          "subscriptionUpdates" -> newUserPreferences.communicationPreferences.subscriptionUpdates.asJson,
          "signInNotifications" -> newUserPreferences.communicationPreferences.signInNotifications.asJson),
        "bettingPreferences" -> Json.obj(
          "autoAcceptBetterOdds" -> newUserPreferences.bettingPreferences.autoAcceptBetterOdds.asJson))

    "the request has no auth header" in {
      Put("/profile/preferences", requestBody) ~> underTest ~> check {
        Then("Status should be Unauthorized")
        status shouldEqual StatusCodes.Unauthorized
      }
    }
    checkPermissions(Set(Active))(Put("/profile/preferences", requestBody) ~> authHeader) { allowedStatus =>
      "fail if the user does not exist" in {
        Given("An environment in which the user does not exist")
        val authenticationRepository = new TestAuthenticationRepository() {
          override def findUser(userId: UserLookupId): Future[Option[RegisteredUserKeycloak]] = Future.successful(None)
        }
        val routes = buildRoutes(
          puntersBoundedContext = new PuntersContextProviderSuccess(PunterDataGenerator.Api.withStatus(allowedStatus)),
          authenticationRepository = authenticationRepository).toAkkaHttp

        When("We make the http request")
        Put("/profile/preferences", requestBody) ~> authHeader ~> routes ~> check {
          Then("Status should be BadRequest")
          status shouldEqual StatusCodes.BadRequest

          And("The error code returned should match the expected one")
          assertErrorResponse(responseAs[Json], "punterProfileDoesNotExist")
        }
      }

      "update the punter preferences on the happy path" in {
        Given("An environment in which the punter exists")
        val punter = generatePunter().copy(punterId = ThePunterId)
        val puntersRepository =
          InMemoryPuntersRepository.withRegisteredPunters(clock.currentOffsetDateTime().minusDays(10), punter)
        val routes = buildRoutes(
          puntersBoundedContext = new PuntersContextProviderSuccess(PunterDataGenerator.Api.withStatus(allowedStatus)),
          puntersRepository = puntersRepository).toAkkaHttp

        When("We make the http request")
        Put("/profile/preferences", requestBody) ~> authHeader ~> routes ~> check {
          Then("Status should be NoContent")
          status shouldEqual StatusCodes.NoContent
        }
        And("The user preferences should have been updated")
        await(puntersRepository.findByPunterId(punter.punterId)).map(_.settings.userPreferences) shouldBe Some(
          newUserPreferences)
      }
    }
  }

  "POST /punters/bets" when {
    val betRequest1 = BetRequest(
      marketId = MarketId(DataProvider.Oddin, "market123"),
      selectionId = "selection123",
      stake = Stake.unsafe(DefaultCurrencyMoney(10)),
      odds = Odds(2.0),
      acceptBetterOdds = true)

    val betRequest2 = BetRequest(
      marketId = MarketId(DataProvider.Oddin, "market123"),
      selectionId = "selection123",
      stake = Stake.unsafe(DefaultCurrencyMoney(10)),
      odds = Odds(2.0),
      acceptBetterOdds = true)

    val betRequests = List(betRequest1, betRequest2)

    checkPermissions(Set(Active))(Post("punters/bets", betRequests) ~> authHeader) { allowedStatus =>
      "fail when the request is missing the authentication header" in {
        Post("/punters/bets", betRequests) ~> buildRoutesFor(allowedStatus) ~> check {
          status shouldEqual StatusCodes.Unauthorized
        }
      }

      "fail when the request is made using an invalid authentication header" in {
        Post("/punters/bets", betRequests) ~> invalidAuthHeader ~> buildRoutesFor(allowedStatus) ~> check {
          status shouldEqual StatusCodes.Unauthorized
        }
      }

      "fail when the request is made without Geolocation header" in {
        Post("/punters/bets", betRequests) ~> authHeader ~> buildRoutesFor(allowedStatus) ~> check {
          status shouldEqual StatusCodes.BadRequest
        }
      }

      "fail when it is a bet with a stake of zero value" in {
        val zeroStakeBetRequest =
          parse("""
              |[{
              |  "marketId": "5226614d-e5fb-4786-acec-a4a8ab10413d",
              |  "selectionId": "a54740b7-30e9-4bb2-8624-42b274e81f48",
              |  "stake": {"amount": 0, "currency": "USD"},
              |  "odds": 1.4,
              |  "acceptBetterOdds": true
              |}]
              |""".stripMargin).get

        Post("/punters/bets", zeroStakeBetRequest) ~> geolocationHeader ~> authHeader ~> buildRoutesFor(
          allowedStatus) ~> check {
          Then("the response status should be BadRequest")
          status shouldEqual StatusCodes.BadRequest
        }
      }

      "fail when the wallet for the punter does not exist" in {
        val walletsBoundedContext = new WalletContextProviderSuccess(clock) {
          override def findResponsibilityCheckStatus(walletId: WalletId)(implicit ec: ExecutionContext)
              : EitherT[Future, WalletsBoundedContextProtocol.WalletNotFoundError, ResponsibilityCheckStatus] =
            EitherT.leftT(WalletsBoundedContextProtocol.WalletNotFoundError(walletId))
        }
        val routes = buildRoutes(
          puntersBoundedContext = new PuntersContextProviderSuccess(examplePunterProfileWith(allowedStatus)),
          walletsBoundedContext = walletsBoundedContext).toAkkaHttp

        Post("/punters/bets", betRequests) ~> geolocationHeader ~> authHeader ~> routes ~> check {
          status shouldEqual StatusCodes.BadRequest
          assertErrorResponse(responseAs[Json], "walletNotFound")
        }
      }

      "fail when the punter needs to accept the responsibility check" in {
        val walletsBoundedContext = new WalletContextProviderSuccess(clock) {
          override def findResponsibilityCheckStatus(walletId: WalletId)(implicit ec: ExecutionContext)
              : EitherT[Future, WalletsBoundedContextProtocol.WalletNotFoundError, ResponsibilityCheckStatus] =
            EitherT.safeRightT(ResponsibilityCheckStatus.NeedsToBeAccepted)
        }
        val routes = buildRoutes(
          puntersBoundedContext = new PuntersContextProviderSuccess(examplePunterProfileWith(allowedStatus)),
          walletsBoundedContext = walletsBoundedContext).toAkkaHttp

        Post("/punters/bets", betRequests) ~> geolocationHeader ~> authHeader ~> routes ~> check {
          status shouldEqual StatusCodes.BadRequest
          assertErrorResponse(responseAs[Json], "punterNeedsToAcceptResponsibilityCheck")
        }
      }

      val walletsBCAcceptingResponsibilityCheck = new WalletContextProviderSuccess(clock) {
        override def findResponsibilityCheckStatus(walletId: WalletId)(implicit ec: ExecutionContext)
            : EitherT[Future, WalletsBoundedContextProtocol.WalletNotFoundError, ResponsibilityCheckStatus] =
          EitherT.safeRightT(ResponsibilityCheckStatus.NoActionNeeded)
      }

      "fail when the bet stake limits would be breached" in {
        val tooBigOfAStakeRequest =
          parse("""
              |[{
              |  "marketId": "m:o:5226614d-e5fb-4786-acec-a4a8ab10413d",
              |  "selectionId": "a54740b7-30e9-4bb2-8624-42b274e81f48",
              |  "stake": {"amount": 99999, "currency": "USD"},
              |  "odds": 1.4,
              |  "acceptBetterOdds": true
              |}]
              |""".stripMargin).get

        val routes = buildRoutes(
          puntersBoundedContext = new PuntersContextProviderSuccess(examplePunterProfileWith(allowedStatus)),
          walletsBoundedContext = walletsBCAcceptingResponsibilityCheck).toAkkaHttp

        Post("/punters/bets", tooBigOfAStakeRequest) ~> geolocationHeader ~> authHeader ~> routes ~> check {
          Then("the response status should be BadRequest")
          status shouldEqual StatusCodes.BadRequest
          assertErrorResponse(responseAs[Json], "stakeLimitsHaveBeenBreached")
        }
      }

      "successfully place bets on the happy path" in {
        Given("a punter that is active and can bet")
        val punters = new PuntersContextProviderSuccess(examplePunterProfileWith(allowedStatus))
        And("a market that is bettable by the bet request, without odds having changed")
        val marketToBetOn =
          generateInitializedMarket(selection = generateSelectionOdds()
            .copy(selectionId = betRequest1.selectionId, odds = Some(betRequest1.odds), active = true))
        val markets =
          MarketBoundedContextMock(getDgeAllowedMarketStateFn = _ => Future.successful(Right(marketToBetOn)))
        And("the punter does not need to accept responsibility check")
        val punterStakeRepository = new TestPunterStakeRepository()
        val routes = buildRoutes(
          puntersBoundedContext = punters,
          marketsBoundedContext = markets,
          punterStakeRepository = punterStakeRepository,
          walletsBoundedContext = walletsBCAcceptingResponsibilityCheck).toAkkaHttp

        When("the request is made")
        Post("/punters/bets", betRequests) ~> geolocationHeader ~> authHeader ~> routes ~> check {
          Then("the response status should be Accepted")
          status shouldEqual StatusCodes.Accepted

          And("we should get two responses, one for each bet")
          val response = responseAs[List[Json]]
          response.length shouldBe 2

          And("the responses should match the expected format and data")
          response.foreach { betDetails =>
            betDetails shouldHaveField ("betId", jsonFieldOfType[String])
            betDetails shouldHaveField ("result", jsonFieldOfTypeContaining[Int](202))
            betDetails shouldHaveField ("marketId", jsonFieldOfTypeContaining[String]("m:o:market123"))
            betDetails shouldHaveField ("selectionId", jsonFieldOfTypeContaining[String]("selection123"))
          }
        }
        And("the bet stake information should be recorded")
        punterStakeRepository.punterStakes should matchPattern {
          case List(
                PunterStake(_, `ThePunterId`, betRequest1.stake, betRequest1.odds, _, BetStatus.Open, None),
                PunterStake(_, `ThePunterId`, betRequest2.stake, betRequest2.odds, _, BetStatus.Open, None)) =>
        }
      }
    }
  }

  "POST /punters/deposit-limits" when {
    val noDepositLimitsRequest = parse("""{"daily": null, "weekly": null, "monthly": null}""").get

    checkPermissions(Set(Active))(Post("/punters/deposit-limits", noDepositLimitsRequest) ~> authHeader) {
      allowedStatus =>
        "respond with 200 OK" in {
          Post("/punters/deposit-limits", TheDepositLimitRequest) ~> authHeader ~> buildRoutesFor(
            allowedStatus) ~> check {
            status shouldEqual StatusCodes.OK
            val response = responseAs[Json]
            Right(response) shouldBe
            parse("""
              |{
              |  "daily": {
              |    "current": {
              |      "limit":1099,
              |      "since":"1970-01-01T00:00:00Z"
              |    }
              |  },
              |  "monthly": {
              |    "current": {
              |      "limit": 100099,
              |      "since":"1970-01-01T00:00:00Z"
              |    }
              |  },
              |  "weekly": {
              |    "current": {
              |      "limit": 10099,
              |      "since": "1970-01-01T00:00:00Z"
              |    }
              |  }
              |}
              |""".stripMargin)
          }
        }

        "allow no limits" in {
          Post("/punters/deposit-limits", noDepositLimitsRequest) ~> authHeader ~> buildRoutesFor(
            allowedStatus) ~> check {
            status shouldEqual StatusCodes.OK
          }
        }

        "respond with 400 BadRequest on invalid request body" in {
          val invalidDepositLimitsRequest = parse("""{"daily": 30, "weekly": 20, "monthly": 10}""").get

          Post("/punters/deposit-limits", invalidDepositLimitsRequest) ~> authHeader ~> buildRoutesFor(
            allowedStatus) ~> check {
            status shouldEqual StatusCodes.BadRequest
          }
        }
    }
  }

  "POST /punters/session-limits" when {
    val changeSessionLimitsRequest =
      parse(
        """{"daily": {"length": 10, "unit": "HOURS"}, "weekly": {"length": 6, "unit": "DAYS"}, "monthly": {"length": 25, "unit": "DAYS"}}""").get
    checkPermissions(Set(Active))(Post("/punters/session-limits", changeSessionLimitsRequest) ~> authHeader) {
      allowedStatus =>
        "return 200 OK with effective limits" in {
          Post("/punters/session-limits", changeSessionLimitsRequest) ~> authHeader ~> buildRoutesFor(
            allowedStatus) ~> check {
            status shouldEqual StatusCodes.OK

            val response = responseAs[Json]
            response shouldHaveField ("daily", havingCurrentAndNextLimit)
            response shouldHaveField ("weekly", havingCurrentAndNextLimit)
            response shouldHaveField ("monthly", havingCurrentAndNextLimit)
          }
        }

        "allow no limits" in {
          val noSessionLimitsRequest = parse("""{"daily": null, "weekly": null, "monthly": null}""").get

          Post("/punters/session-limits", noSessionLimitsRequest) ~> authHeader ~> buildRoutesFor(
            allowedStatus) ~> check {
            status shouldEqual StatusCodes.OK
          }
        }

        "returns 400 BadRequest for invalid session limits" in {
          val invalidSessionLimitRequests =
            """{"daily": {"length": 25, "unit": "HOURS"}, "weekly": {"length": 6, "unit": "DAYS"}, "monthly": {"length": 25, "unit": "DAYS"}}"""

          Post("/punters/session-limits", invalidSessionLimitRequests) ~> authHeader ~> buildRoutesFor(
            allowedStatus) ~> check {
            status shouldEqual StatusCodes.BadRequest
          }
        }
    }
  }

  "POST /punters/stake-limits" when {
    val stakeLimitsRequestBody = parse("""{"daily": 200, "weekly": 1000, "monthly": 2500}""").get

    checkPermissions(Set(Active))(Post("/punters/stake-limits", stakeLimitsRequestBody) ~> authHeader) {
      allowedStatus =>
        "respond with 200 OK on the happy path" in {
          Post("/punters/stake-limits", stakeLimitsRequestBody) ~> authHeader ~> buildRoutesFor(
            allowedStatus) ~> check {
            status shouldEqual StatusCodes.OK
            val response = responseAs[Json]

            response shouldHaveField ("daily", daily =>
              daily shouldHaveField ("current", { current =>
                current shouldHaveField ("limit", jsonFieldOfTypeContaining(200))
                current shouldHaveField ("since", jsonFieldOfTypeContaining("1970-01-01T00:00:00Z"))
              }))
            response shouldHaveField ("weekly", weekly =>
              weekly shouldHaveField ("current", { current =>
                current shouldHaveField ("limit", jsonFieldOfTypeContaining(1000))
                current shouldHaveField ("since", jsonFieldOfTypeContaining("1970-01-01T00:00:00Z"))
              }))
            response shouldHaveField ("monthly", monthly =>
              monthly shouldHaveField ("current", { current =>
                current shouldHaveField ("limit", jsonFieldOfTypeContaining(2500))
                current shouldHaveField ("since", jsonFieldOfTypeContaining("1970-01-01T00:00:00Z"))
              }))
          }
        }

        "allow no limits" in {
          val noDepositLimitsRequest = parse("""{"daily": null, "weekly": null, "monthly": null}""").get

          Post("/punters/stake-limits", noDepositLimitsRequest) ~> authHeader ~> underTest ~> check {
            status shouldEqual StatusCodes.OK
          }
        }

        "respond with 400 BadRequest on invalid request body" in {
          val invalidStakeLimitsRequest = parse("""{"daily": 30, "weekly": 20, "monthly": 10}""").get

          Post("/punters/stake-limits", invalidStakeLimitsRequest) ~> authHeader ~> buildRoutesFor(
            allowedStatus) ~> check {
            status shouldEqual StatusCodes.BadRequest
          }
        }
    }
  }

  "PUT /profile/email" when {
    "the request has no body" in {
      Put("/profile/email") ~> authHeader ~> underTest ~> check {
        Then("status should be BadRequest")
        status shouldEqual StatusCodes.BadRequest
      }
    }

    val updateEmailRequest =
      parse(s"""{
         |  "newEmail": "newEmail@test.com",
         |  "verificationId": "some_verification_id",
         |  "verificationCode": "123456"
         |} """.stripMargin).get

    "the request is not authenticated" in {
      Put("/profile/email", updateEmailRequest) ~> underTest ~> check {
        Then("status should be Unauthorized")
        status shouldEqual StatusCodes.Unauthorized
      }
    }

    checkPermissions(Set(Active))(Put("/profile/email", updateEmailRequest) ~> authHeader) { allowedStatus =>
      "fail if the verification is not passed" in {
        val multiFactorAuthenticationService = new TestMultiFactorAuthenticationService() {
          override def approveVerification(
              verificationId: MultifactorVerificationId,
              verificationCode: MultifactorVerificationCode): EitherT[Future, VerificationFailure, Unit] =
            EitherT.leftT(VerificationFailure.IncorrectVerificationCode)
        }
        val testRoutes = buildRoutes(
          puntersBoundedContext = new PuntersContextProviderSuccess(PunterDataGenerator.Api.withStatus(allowedStatus)),
          multiFactorAuthenticationService = multiFactorAuthenticationService).toAkkaHttp

        Put("/profile/email", updateEmailRequest) ~> authHeader ~> testRoutes ~> check {
          status shouldEqual StatusCodes.BadRequest
          assertErrorResponse(responseAs[Json], "incorrectMFAVerification")
        }
      }

      "fail if the email is already used by another user" in {
        val authenticationRepository = new TestAuthenticationRepository() {
          override def userExists(userId: UserLookupId): Future[Boolean] = Future.successful(true)
        }
        val testRoutes = buildRoutes(
          puntersBoundedContext = new PuntersContextProviderSuccess(PunterDataGenerator.Api.withStatus(allowedStatus)),
          authenticationRepository = authenticationRepository).toAkkaHttp

        Put("/profile/email", updateEmailRequest) ~> authHeader ~> testRoutes ~> check {
          status shouldEqual StatusCodes.Conflict
          assertErrorResponse(responseAs[Json], "emailAlreadyUsed")
        }
      }

      "fail if the punter is not found" in {
        val authenticationRepository = new TestAuthenticationRepository() {
          override def findUser(userId: UserLookupId): Future[Option[RegisteredUserKeycloak]] = Future.successful(None)
        }
        val testRoutes = buildRoutes(
          puntersBoundedContext = new PuntersContextProviderSuccess(PunterDataGenerator.Api.withStatus(allowedStatus)),
          authenticationRepository = authenticationRepository).toAkkaHttp

        Put("/profile/email", updateEmailRequest) ~> authHeader ~> testRoutes ~> check {
          status shouldEqual StatusCodes.BadRequest
          assertErrorResponse(responseAs[Json], "punterProfileDoesNotExist")
        }
      }

      "change the punter email on the happy path" in {
        Given("an environment in which the user exists and has the mfa enabled status disabled")
        val registeredUser =
          generateRegisteredUser().copy(userId = domain.UserId(UUID.fromString(ThePunterId.value)))
        val authenticationRepository = new MemorizingTestAuthenticationRepository() {
          override def findUser(userId: UserLookupId): Future[Option[RegisteredUserKeycloak]] =
            Future.successful(Some(registeredUser.toKeycloakUser()))
        }
        val puntersRepository =
          InMemoryPuntersRepository.withRegisteredPunters(clock.currentOffsetDateTime(), registeredUser.toPunter())

        val testRoutes = buildRoutes(
          puntersBoundedContext = new PuntersContextProviderSuccess(PunterDataGenerator.Api.withStatus(allowedStatus)),
          authenticationRepository = authenticationRepository,
          puntersRepository = puntersRepository).toAkkaHttp

        When("the http request is made")
        Put("/profile/email", updateEmailRequest) ~> authHeader ~> testRoutes ~> check {
          Then("the response status should be NoContent")
          status shouldEqual StatusCodes.NoContent
        }
        And("the email should be changed")
        val userWithNewDetails =
          registeredUser
            .focus(_.details.email)
            .replace(Email.fromStringUnsafe("newEmail@test.com"))
            .focus(_.details.isEmailVerified)
            .replace(false)
        authenticationRepository.userUpdates should ===(
          List((ThePunterId, userWithNewDetails.toKeycloakUser().details)))
        await(puntersRepository.findByPunterId(registeredUser.userId.asPunterId)) should ===(
          Some(userWithNewDetails.toPunter()))
      }
    }
  }

  "PUT /profile/multi-factor-authentication" when {
    "the request has no body" in {
      Put("/profile/multi-factor-authentication") ~> authHeader ~> underTest ~> check {
        Then("status should be BadRequest")
        status shouldEqual StatusCodes.BadRequest
      }
    }

    "fail if the request has an invalid amount of numbers in the verification code" in {
      val wrongAmountOfNumbersInVerificationCodeRequest =
        parse(s"""{
           |  "enabled": true,
           |  "verificationId": "some_verification_id",
           |  "verificationCode": "123"
           |} """.stripMargin).get

      Put(
        "/profile/multi-factor-authentication",
        wrongAmountOfNumbersInVerificationCodeRequest) ~> authHeader ~> underTest ~> check {
        Then("status should be BadRequest")
        status shouldEqual StatusCodes.BadRequest
      }
    }

    val enableMFARequest =
      json"""{
         "enabled": true,
         "verificationId": "some_verification_id",
         "verificationCode": "123456"
       }"""

    val disableMFARequest =
      json"""{
         "enabled": false,
         "verificationId": "some_verification_id",
         "verificationCode": "123456"
       }"""

    val validBody = enableMFARequest
    checkPermissions(Set(Active))(Put("/profile/multi-factor-authentication", validBody) ~> authHeader) {
      allowedStatus =>
        "fail if the request is not authenticated" in {
          Put("/profile/multi-factor-authentication", enableMFARequest) ~> buildRoutesFor(allowedStatus) ~> check {
            status shouldEqual StatusCodes.Unauthorized
          }
        }

        "fail if the verification is not passed" in {
          val registeredUser =
            generateRegisteredUserKeycloak()
              .copy(userId = domain.UserId(UUID.fromString(ThePunterId.value)), admin = false)
          val authenticationRepository = new MemorizingTestAuthenticationRepository() {
            override def findUser(userId: UserLookupId): Future[Option[RegisteredUserKeycloak]] =
              Future.successful(Some(registeredUser))
          }
          val multiFactorAuthenticationService = new TestMultiFactorAuthenticationService() {
            override def approveVerification(
                verificationId: MultifactorVerificationId,
                verificationCode: MultifactorVerificationCode): EitherT[Future, VerificationFailure, Unit] =
              EitherT.leftT(VerificationFailure.IncorrectVerificationCode)
          }
          val puntersDomainConfig = generatePuntersDomainConfig().focus(_.mfa.changeAllowed).replace(true)
          val testRoutes = buildRoutes(
            puntersBoundedContext =
              new PuntersContextProviderSuccess(PunterDataGenerator.Api.withStatus(allowedStatus)),
            multiFactorAuthenticationService = multiFactorAuthenticationService,
            puntersDomainConfig = puntersDomainConfig,
            authenticationRepository = authenticationRepository).toAkkaHttp

          Put("/profile/multi-factor-authentication", enableMFARequest) ~> authHeader ~> testRoutes ~> check {
            status shouldEqual StatusCodes.BadRequest
            assertErrorResponse(responseAs[Json], "incorrectMFAVerification")
          }
        }

        "fail if the punter is not found" in {
          val authenticationRepository = new TestAuthenticationRepository() {
            override def findUser(userId: UserLookupId): Future[Option[RegisteredUserKeycloak]] =
              Future.successful(None)
          }
          val puntersDomainConfig = generatePuntersDomainConfig().focus(_.mfa.changeAllowed).replace(true)
          val testRoutes = buildRoutes(
            puntersBoundedContext =
              new PuntersContextProviderSuccess(PunterDataGenerator.Api.withStatus(allowedStatus)),
            authenticationRepository = authenticationRepository,
            puntersDomainConfig = puntersDomainConfig).toAkkaHttp

          Put("/profile/multi-factor-authentication", enableMFARequest) ~> authHeader ~> testRoutes ~> check {
            status shouldEqual StatusCodes.BadRequest
            assertErrorResponse(responseAs[Json], "punterProfileDoesNotExist")
          }
        }

        "fail if disabling MFA setting is no allowed" in {
          val registeredUser =
            generateRegisteredUserKeycloak()
              .copy(userId = domain.UserId(UUID.fromString(ThePunterId.value)), admin = false)
          val authenticationRepository = new MemorizingTestAuthenticationRepository() {
            override def findUser(userId: UserLookupId): Future[Option[RegisteredUserKeycloak]] =
              Future.successful(Some(registeredUser))
          }

          val puntersDomainConfig = generatePuntersDomainConfig().focus(_.mfa.changeAllowed).replace(false)
          val testRoutes = buildRoutes(
            puntersBoundedContext =
              new PuntersContextProviderSuccess(PunterDataGenerator.Api.withStatus(allowedStatus)),
            authenticationRepository = authenticationRepository,
            puntersDomainConfig = puntersDomainConfig).toAkkaHttp

          Put("/profile/multi-factor-authentication", disableMFARequest) ~> authHeader ~> testRoutes ~> check {
            status shouldEqual StatusCodes.BadRequest
            assertErrorResponse(responseAs[Json], "mfaSettingChangeNotAllowed")
          }
        }

        forAll(List(true, false)) { mfaSettingChangeAllowed =>
          "change the punter multi factor authentication enabled status on the happy path" when {
            s"disabling MFA setting is ${if (mfaSettingChangeAllowed) "" else "not"} allowed" in {
              Given("an environment in which the user exists and has the mfa disabled")
              val registeredUser =
                generateRegisteredUserKeycloak().copy(userId = domain.UserId(UUID.fromString(ThePunterId.value)))
              val authenticationRepository = new MemorizingTestAuthenticationRepository() {
                override def findUser(userId: UserLookupId): Future[Option[RegisteredUserKeycloak]] =
                  Future.successful(Some(registeredUser))
              }
              val puntersRepository = new InMemoryPuntersRepository()
              val punter = generatePunter().copy(punterId = ThePunterId)
              awaitRight(puntersRepository.register(punter, clock.currentOffsetDateTime()))

              val puntersDomainConfig =
                generatePuntersDomainConfig().focus(_.mfa.changeAllowed).replace(mfaSettingChangeAllowed)
              val testRoutes = buildRoutes(
                puntersBoundedContext =
                  new PuntersContextProviderSuccess(PunterDataGenerator.Api.withStatus(allowedStatus)),
                authenticationRepository = authenticationRepository,
                puntersDomainConfig = puntersDomainConfig,
                puntersRepository = puntersRepository).toAkkaHttp

              When("the http request is made")
              Put("/profile/multi-factor-authentication", enableMFARequest) ~> authHeader ~> testRoutes ~> check {
                Then("the response status should be NoContent")
                status shouldEqual StatusCodes.NoContent
              }
              And("the two factor authentication enabled should be changed")
              puntersRepository.punterSettings(ThePunterId).mfaEnabled should ===(true)
            }
          }
        }
    }

  }

  "GET /punters/limits-history" when {
    val puntersRepository = new InMemoryPuntersRepository()
    val limitsHistoryRepository = new InMemoryPunterLimitsHistoryRepository()
    val now = clock.currentOffsetDateTime()
    val offsetDateTimeFormatter = DateTimeFormatter.ISO_OFFSET_DATE_TIME

    val expectedLimitChanges = PunterDataGenerator.generateLimitChanges(8)
    expectedLimitChanges.foreach { limitChange => await(limitsHistoryRepository.insert(limitChange)) }

    val punterId = expectedLimitChanges.head.punterId
    val punter = generatePunter().copy(punterId = punterId)
    awaitRight(puntersRepository.register(punter, now))

    checkPermissions(Set(Active, InCoolOff))(Get("/punters/limits-history") ~> authHeader) { allowedStatus =>
      val testRoutes = {
        val (puntersBoundedContext, authenticationRepository, puntersRepository) = punterEnvironmentFor(allowedStatus)
        buildRoutes(
          puntersBoundedContext = puntersBoundedContext,
          authenticationRepository = authenticationRepository,
          puntersRepository = puntersRepository,
          limitsHistoryRepository = limitsHistoryRepository).toAkkaHttp
      }

      "return 200 OK" in {
        val PunterLimitsHistoryJson =
          parse(s"""
          {
            "data" : [
              {
                "punterId" : "${expectedLimitChanges(7).punterId.value}",
                "limitType" : "${getLimitTypeRawString(expectedLimitChanges(7).limitType)}",
                "period" : "${getLimitPeriodRawString(expectedLimitChanges(7).period)}",
                "limit" : "${expectedLimitChanges(7).limit}",
                "effectiveFrom" : "${offsetDateTimeFormatter.format(expectedLimitChanges(7).effectiveFrom)}",
                "requestedAt" : "${offsetDateTimeFormatter.format(expectedLimitChanges(7).requestedAt)}",
                "id" : 8
              },
              {
                "punterId" : "${expectedLimitChanges(6).punterId.value}",
                "limitType" : "${getLimitTypeRawString(expectedLimitChanges(6).limitType)}",
                "period" : "${getLimitPeriodRawString(expectedLimitChanges(6).period)}",
                "limit" : "${expectedLimitChanges(6).limit}",
                "effectiveFrom" : "${offsetDateTimeFormatter.format(expectedLimitChanges(6).effectiveFrom)}",
                "requestedAt" : "${offsetDateTimeFormatter.format(expectedLimitChanges(6).requestedAt)}",
                "id" : 7
              },
              {
                "punterId" : "${expectedLimitChanges(5).punterId.value}",
                "limitType" : "${getLimitTypeRawString(expectedLimitChanges(5).limitType)}",
                "period" : "${getLimitPeriodRawString(expectedLimitChanges(5).period)}",
                "limit" : "${expectedLimitChanges(5).limit}",
                "effectiveFrom" : "${offsetDateTimeFormatter.format(expectedLimitChanges(5).effectiveFrom)}",
                "requestedAt" : "${offsetDateTimeFormatter.format(expectedLimitChanges(5).requestedAt)}",
                "id" : 6
              },
              {
                "punterId" : "${expectedLimitChanges(4).punterId.value}",
                "limitType" : "${getLimitTypeRawString(expectedLimitChanges(4).limitType)}",
                "period" : "${getLimitPeriodRawString(expectedLimitChanges(4).period)}",
                "limit" : "${expectedLimitChanges(4).limit}",
                "effectiveFrom" : "${offsetDateTimeFormatter.format(expectedLimitChanges(4).effectiveFrom)}",
                "requestedAt" : "${offsetDateTimeFormatter.format(expectedLimitChanges(4).requestedAt)}",
                "id" : 5
              },
              {
                "punterId" : "${expectedLimitChanges(3).punterId.value}",
                "limitType" : "${getLimitTypeRawString(expectedLimitChanges(3).limitType)}",
                "period" : "${getLimitPeriodRawString(expectedLimitChanges(3).period)}",
                "limit" : "${expectedLimitChanges(3).limit}",
                "effectiveFrom" : "${offsetDateTimeFormatter.format(expectedLimitChanges(3).effectiveFrom)}",
                "requestedAt" : "${offsetDateTimeFormatter.format(expectedLimitChanges(3).requestedAt)}",
                "id" : 4
              },
              {
                "punterId" : "${expectedLimitChanges(2).punterId.value}",
                "limitType" : "${getLimitTypeRawString(expectedLimitChanges(2).limitType)}",
                "period" : "${getLimitPeriodRawString(expectedLimitChanges(2).period)}",
                "limit" : "${expectedLimitChanges(2).limit}",
                "effectiveFrom" : "${offsetDateTimeFormatter.format(expectedLimitChanges(2).effectiveFrom)}",
                "requestedAt" : "${offsetDateTimeFormatter.format(expectedLimitChanges(2).requestedAt)}",
                "id" : 3
              },
              {
                "punterId" : "${expectedLimitChanges(1).punterId.value}",
                "limitType" : "${getLimitTypeRawString(expectedLimitChanges(1).limitType)}",
                "period" : "${getLimitPeriodRawString(expectedLimitChanges(1).period)}",
                "limit" : "${expectedLimitChanges(1).limit}",
                "effectiveFrom" : "${offsetDateTimeFormatter.format(expectedLimitChanges(1).effectiveFrom)}",
                "requestedAt" : "${offsetDateTimeFormatter.format(expectedLimitChanges(1).requestedAt)}",
                "id" : 2
              },
              {
                "punterId" : "${expectedLimitChanges(0).punterId.value}",
                "limitType" : "${getLimitTypeRawString(expectedLimitChanges(0).limitType)}",
                "period" : "${getLimitPeriodRawString(expectedLimitChanges(0).period)}",
                "limit" : "${expectedLimitChanges(0).limit}",
                "effectiveFrom" : "${offsetDateTimeFormatter.format(expectedLimitChanges(0).effectiveFrom)}",
                "requestedAt" : "${offsetDateTimeFormatter.format(expectedLimitChanges(0).requestedAt)}",
                "id" : 1
              }
            ],
            "currentPage" : 1,
            "itemsPerPage" : 20,
            "totalCount" : 8,
            "hasNextPage" : false
          }
          """).get

        Get("/punters/limits-history") ~> authHeader ~> testRoutes ~> check {
          status shouldEqual StatusCodes.OK
          responseAs[Json] shouldEqual PunterLimitsHistoryJson
        }
      }

      "return 401 on unauthorized punter profile" in {
        Get("/punters/limits-history") ~> testRoutes ~> check {
          status shouldEqual StatusCodes.Unauthorized
        }
      }
    }
  }

  "GET /punters/cool-offs-history" when {
    val puntersRepository = new InMemoryPuntersRepository()
    val coolOffsHistoryRepository = new InMemoryPunterCoolOffsHistoryRepository()
    val now = clock.currentOffsetDateTime()
    val offsetDateTimeFormatter = DateTimeFormatter.ISO_OFFSET_DATE_TIME

    val expectedCoolOffs = PunterDataGenerator.generateCoolOffs(8)
    expectedCoolOffs.foreach { coolOff => await(coolOffsHistoryRepository.insert(coolOff)) }

    val punterId = expectedCoolOffs.head.punterId
    val punter = generatePunter().copy(punterId = punterId)
    awaitRight(puntersRepository.register(punter, now))

    checkPermissions(Set(Active, InCoolOff))(Get("/punters/cool-offs-history") ~> authHeader) { allowedStatus =>
      val testRoutes = {
        val (puntersBoundedContext, authenticationRepository, puntersRepository) = punterEnvironmentFor(allowedStatus)
        buildRoutes(
          puntersBoundedContext = puntersBoundedContext,
          authenticationRepository = authenticationRepository,
          puntersRepository = puntersRepository,
          coolOffsHistoryRepository = coolOffsHistoryRepository).toAkkaHttp
      }

      "return 200 OK" in {
        val PunterCoolOffsHistoryJson =
          json"""
            {
              "data": [
                {
                  "punterId": ${expectedCoolOffs(7).punterId.value},
                  "coolOffStart": ${offsetDateTimeFormatter.format(expectedCoolOffs(7).coolOffStart)},
                  "coolOffEnd": ${offsetDateTimeFormatter.format(expectedCoolOffs(7).coolOffEnd)},
                  "coolOffCause": ${expectedCoolOffs(7).coolOffCause.entryName}
                },
                {
                  "punterId": ${expectedCoolOffs(6).punterId.value},
                  "coolOffStart": ${offsetDateTimeFormatter.format(expectedCoolOffs(6).coolOffStart)},
                  "coolOffEnd": ${offsetDateTimeFormatter.format(expectedCoolOffs(6).coolOffEnd)},
                  "coolOffCause": ${expectedCoolOffs(6).coolOffCause.entryName}
                },
                {
                  "punterId": ${expectedCoolOffs(5).punterId.value},
                  "coolOffStart": ${offsetDateTimeFormatter.format(expectedCoolOffs(5).coolOffStart)},
                  "coolOffEnd": ${offsetDateTimeFormatter.format(expectedCoolOffs(5).coolOffEnd)},
                  "coolOffCause": ${expectedCoolOffs(5).coolOffCause.entryName}
                },
                {
                  "punterId": ${expectedCoolOffs(4).punterId.value},
                  "coolOffStart": ${offsetDateTimeFormatter.format(expectedCoolOffs(4).coolOffStart)},
                  "coolOffEnd": ${offsetDateTimeFormatter.format(expectedCoolOffs(4).coolOffEnd)},
                  "coolOffCause": ${expectedCoolOffs(4).coolOffCause.entryName}
                },
                {
                  "punterId": ${expectedCoolOffs(3).punterId.value},
                  "coolOffStart": ${offsetDateTimeFormatter.format(expectedCoolOffs(3).coolOffStart)},
                  "coolOffEnd": ${offsetDateTimeFormatter.format(expectedCoolOffs(3).coolOffEnd)},
                  "coolOffCause": ${expectedCoolOffs(3).coolOffCause.entryName}
                },
                {
                  "punterId": ${expectedCoolOffs(2).punterId.value},
                  "coolOffStart": ${offsetDateTimeFormatter.format(expectedCoolOffs(2).coolOffStart)},
                  "coolOffEnd": ${offsetDateTimeFormatter.format(expectedCoolOffs(2).coolOffEnd)},
                  "coolOffCause": ${expectedCoolOffs(2).coolOffCause.entryName}
                },
                {
                  "punterId": ${expectedCoolOffs(1).punterId.value},
                  "coolOffStart": ${offsetDateTimeFormatter.format(expectedCoolOffs(1).coolOffStart)},
                  "coolOffEnd": ${offsetDateTimeFormatter.format(expectedCoolOffs(1).coolOffEnd)},
                  "coolOffCause": ${expectedCoolOffs(1).coolOffCause.entryName}
                },
                {
                  "punterId": ${expectedCoolOffs(0).punterId.value},
                  "coolOffStart": ${offsetDateTimeFormatter.format(expectedCoolOffs(0).coolOffStart)},
                  "coolOffEnd": ${offsetDateTimeFormatter.format(expectedCoolOffs(0).coolOffEnd)},
                  "coolOffCause": ${expectedCoolOffs(0).coolOffCause.entryName}
                }
              ],
              "currentPage": 1,
              "itemsPerPage": 20,
              "totalCount": 8,
              "hasNextPage": false
            }
          """

        Get("/punters/cool-offs-history") ~> authHeader ~> testRoutes ~> check {
          status shouldEqual StatusCodes.OK
          responseAs[Json] shouldEqual PunterCoolOffsHistoryJson
        }
      }

      "return 401 on unauthorized punter profile" in {
        Get("/punters/cool-offs-history") ~> testRoutes ~> check {
          status shouldEqual StatusCodes.Unauthorized
        }
      }
    }
  }

  "GET /punters/current-session" when {

    "fail when no authorization is passed" in {
      Get("/punters/current-session") ~> buildRoutes().toAkkaHttp ~> check {
        status shouldEqual StatusCodes.Unauthorized
      }
    }

    "fail when the punter is not found" in {
      val routes = buildRoutes(puntersBoundedContext = new PuntersContextProviderSuccess() {
        override def getPunterProfile(id: PunterId)(implicit
            ec: ExecutionContext): EitherT[Future, PunterProfileDoesNotExist, PunterProfile] = {
          EitherT.leftT(PunterProfileDoesNotExist(id))
        }
      }).toAkkaHttp

      Get("/punters/current-session") ~> authHeader ~> routes ~> check {
        status shouldEqual StatusCodes.NotFound
        assertErrorResponse(responseAs[Json], "punterProfileDoesNotExist")
      }
    }

    checkPermissions(AllStatusesAllowed)(Get("/punters/current-session"), buildRoutesFor) { allowedStatus =>
      "fail when the punter doesn't have a current active session" in {
        val routes = buildRoutes(puntersBoundedContext = new PuntersContextProviderSuccess(
          PunterDataGenerator.Api.withStatus(allowedStatus).copy(maybeCurrentSession = None))).toAkkaHttp

        Get("/punters/current-session") ~> authHeader ~> routes ~> check {
          status shouldEqual StatusCodes.NotFound
          assertErrorResponse(responseAs[Json], "punterHasNoActiveSession")
        }
      }

      "succeed on the happy path" in {
        val currentSession = StartedSession(generateSessionId(), randomOffsetDateTime(), Some(generateIpAddress()))
        val routes = buildRoutes(puntersBoundedContext = new PuntersContextProviderSuccess(
          PunterDataGenerator.Api
            .withStatus(allowedStatus)
            .copy(maybeCurrentSession = Some(currentSession)))).toAkkaHttp

        Get("/punters/current-session") ~> authHeader ~> routes ~> check {
          status shouldEqual StatusCodes.OK

          val response = responseAs[Json]
          response shouldHaveField ("currentTime", jsonFieldOfType[String])
          response shouldHaveField ("sessionStartTime", jsonFieldOfType[String])
        }
      }
    }
  }

  "PUT /responsibility-check/accept" when {
    checkPermissions(AllStatusesAllowed)(Put("/responsibility-check/accept")) { allowedStatus =>
      "fail if no authentication header is passed" in {
        Put("/responsibility-check/accept") ~> buildRoutesFor(allowedStatus) ~> check {
          status shouldEqual StatusCodes.Unauthorized
        }
      }

      "fail if a wallet for the given user does not exist" in {
        Given("An environment in which the wallet does not exist")
        val walletsBoundedContext = new WalletContextProviderFailure() {
          override def acceptResponsibilityCheck(walletId: WalletsBoundedContextProtocol.WalletId)(implicit
              ec: ExecutionContext): EitherT[Future, WalletsBoundedContextProtocol.WalletNotFoundError, Unit] =
            EitherT.leftT(WalletsBoundedContextProtocol.WalletNotFoundError(walletId))
        }
        val testRoutes = buildRoutes(
          puntersBoundedContext = new PuntersContextProviderSuccess(examplePunterProfileWith(allowedStatus)),
          walletsBoundedContext = walletsBoundedContext).toAkkaHttp

        When("The request is made")
        Put("/responsibility-check/accept") ~> authHeader ~> testRoutes ~> check {
          Then("The response should be failed with 'NotFound'")
          status shouldEqual StatusCodes.NotFound

          And("The correct error code should be reported")
          assertErrorResponse(responseAs[Json], "walletNotFound")
        }
      }

      "accept the responsibility check on the happy path" in {
        val walletsBoundedContext = new MemorizedTestWalletsContext(clock)
        val testRoutes = buildRoutes(
          puntersBoundedContext = new PuntersContextProviderSuccess(examplePunterProfileWith(allowedStatus)),
          walletsBoundedContext = walletsBoundedContext).toAkkaHttp

        Put("/responsibility-check/accept") ~> authHeader ~> testRoutes ~> check {
          status shouldEqual StatusCodes.NoContent
        }
        walletsBoundedContext.responsibilityCheckStatusAccepts shouldBe List(WalletId.deriveFrom(ThePunterId))
      }
    }
  }

  "GET /sports/foo/fixtures/bar" when {
    checkPermissions(AllStatusesAllowed)(Get("/sports/s:o:foo/fixtures/f:o:bar") ~> authHeader) { allowedStatus =>
      "succeed on the happy path" in {
        Get("/sports/s:o:foo/fixtures/f:o:bar") ~> authHeader ~> buildRoutesFor(allowedStatus) ~> check {
          Then("response should be 'Ok'")
          status shouldEqual StatusCodes.OK

          Right(responseAs[Json]) shouldBe parse(FixtureDetailResponse.responseJson)
        }
      }
    }
  }

  "GET /sports" when {
    checkPermissions(AllStatusesAllowed)(Get("/sports")) { allowedStatus =>
      "succeed on the happy path" in {
        Get("/sports") ~> buildRoutesFor(allowedStatus) ~> check {
          Then("response should be 'Ok'")
          status shouldEqual StatusCodes.OK
        }
      }
    }
  }

  "GET /fixtures" when {
    checkPermissions(AllStatusesAllowed)(Get("/fixtures")) { allowedStatus =>
      "succeed on the happy path" in {
        Get("/fixtures") ~> buildRoutesFor(allowedStatus) ~> check {
          Then("The response should be 'Ok'")
          status shouldEqual StatusCodes.OK

          Right(responseAs[Json]) shouldBe parse(FixtureNavigationDataResponse.responseJson(Pagination(1, 20)))
        }
      }
    }
  }

  "GET /punters/bets" when {
    checkPermissions(Set(Active, InCoolOff))(Get("/punters/bets") ~> authHeader) { allowedStatus =>
      "succeed on the happy path" in {
        val (registeredUserKeycloak, punterProfile, _) = userFor(allowedStatus)
        val betsBoundedContext = BetsBoundedContextMock.betsSearchMock(
          PaginatedResult(
            Seq(BetView(
              betId = BetId("47a9efb2-86e7-4bcd-989d-0a8350f717f7"),
              betType = BetType.Single,
              stake = Stake.unsafe(DefaultCurrencyMoney(101)),
              outcome = None,
              placedAt = "2021-06-05T09:01:45.938927Z".toUtcOffsetDateTime,
              settledAt = None,
              voidedAt = None,
              cancelledAt = None,
              odds = Odds(2),
              sports = List(SportSummary(id = SportId(DataProvider.Phoenix, "8"), name = "Overwatch")),
              profitLoss = None,
              legs = List(Leg(
                id = BetId("47a9efb2-86e7-4bcd-989d-0a8350f717f7"),
                sport = SportSummary(id = SportId(DataProvider.Phoenix, "8"), name = "Overwatch"),
                tournament = TournamentSummary(
                  id = TournamentId(DataProvider.Oddin, "1309"),
                  name = "Overwatch League 2021 - June Joust"),
                fixture = FixtureSummary(
                  id = FixtureId(DataProvider.Oddin, "29968"),
                  name = "Los Angeles Valiant vs Philadelphia Fusion",
                  startTime = "2021-06-05T09:00:00Z".toUtcOffsetDateTime,
                  status = FixtureLifecycleStatus.InPlay),
                market = MarketSummary(
                  id = MarketId(DataProvider.Oddin, "003eda06-95f7-4ae1-9038-ba3042b979ac"),
                  name = "Match winner - twoway"),
                selection = SelectionSummary(id = "2", name = "away"),
                competitor = Some(CompetitorSummary(
                  id = CompetitorId(DataProvider.Oddin, "od:competitor:65"),
                  name = "Philadelphia Fusion")),
                odds = Odds(1.47),
                settledAt = None,
                outcome = None,
                status = BetStatus.Open)))),
            currentPage = 1,
            itemsPerPage = 20,
            totalCount = 1,
            hasNextPage = false))
        val routes = buildRoutes(
          puntersBoundedContext = new PuntersContextProviderSuccess(punterProfile),
          authenticationRepository = new TestAuthenticationRepository() {
            override def findUser(userId: UserLookupId): Future[Option[RegisteredUserKeycloak]] =
              Future.successful(Some(registeredUserKeycloak))
          },
          betsBoundedContext = betsBoundedContext).toAkkaHttp

        val expectedResponseBody = parse("""
          |{
          |  "currentPage": 1,
          |  "data": [{
          |    "betId": "47a9efb2-86e7-4bcd-989d-0a8350f717f7",
          |    "betType": "SINGLE",
          |    "legs": [{
          |      "competitor": {
          |        "id": "c:o:od:competitor:65",
          |        "name": "Philadelphia Fusion"
          |      },
          |      "fixture": {
          |        "id": "f:o:29968",
          |        "name": "Los Angeles Valiant vs Philadelphia Fusion",
          |        "startTime": "2021-06-05T09:00:00Z",
          |        "status":"IN_PLAY"
          |      },
          |      "id": "47a9efb2-86e7-4bcd-989d-0a8350f717f7",
          |      "market": {
          |        "id": "m:o:003eda06-95f7-4ae1-9038-ba3042b979ac",
          |        "name": "Match winner - twoway"
          |      },
          |      "displayOdds": {
          |        "decimal": 1.47,
          |        "american": "-213",
          |        "fractional": "8/17"
          |      },
          |      "selection": {
          |        "id": "2",
          |        "name": "away"
          |      },
          |      "sport": {
          |        "id": "s:p:8",
          |        "name": "Overwatch"
          |      },
          |      "status": "OPEN",
          |      "tournament": {
          |        "id": "t:o:1309",
          |        "name": "Overwatch League 2021 - June Joust"
          |      }}
          |    ],
          |    "displayOdds": {
          |      "decimal": 2,
          |      "american": "+100",
          |      "fractional": "1/1"
          |    },
          |    "placedAt": "2021-06-05T09:01:45.938927Z",
          |    "sports": [{
          |      "id": "s:p:8",
          |      "name": "Overwatch"
          |    }],
          |    "stake": {
          |      "amount": 101,
          |      "currency": "USD"
          |    }
          |  }],
          |  "hasNextPage": false,
          |  "itemsPerPage": 20,
          |  "totalCount": 1
          |}
          """.stripMargin).get

        Get("/punters/bets") ~> authHeader ~> routes ~> check {
          Then("response should be 'Ok'")
          status shouldEqual StatusCodes.OK

          responseAs[Json] shouldBe expectedResponseBody
        }
      }
    }
  }

  "GET /punters/wallet/balance" when {
    checkPermissions(AllStatusesAllowed)(Get("/punters/wallet/balance")) { allowedStatus =>
      "succeed on the happy path" in {
        Get("/punters/wallet/balance") ~> authHeader ~> buildRoutesFor(allowedStatus) ~> check {
          Then("response should be 'Ok'")
          status shouldEqual StatusCodes.OK
        }
      }
    }
  }

  "GET /punters/wallet/transactions" when {
    checkPermissions(AllStatusesAllowed)(Get("/punters/wallet/transactions")) { allowedStatus =>
      "succeed on the happy path" in {
        Get("/punters/wallet/transactions") ~> authHeader ~> buildRoutesFor(allowedStatus) ~> check {
          Then("response should be 'Ok'")
          status shouldEqual StatusCodes.OK
        }
      }
    }
  }

  "GET /payments/transactions/B1237" when {
    checkPermissions(AllStatusesAllowed)(Get("payments/transactions/B1237"), buildRoutesFor) { allowedStatus =>
      "succeed on the happy path" in {
        Get("payments/transactions/B1237") ~> authHeader ~> buildRoutesFor(allowedStatus) ~> check {
          Then("response should be 'NotFound'")
          status shouldEqual StatusCodes.NotFound
        }
      }
    }
  }

  "POST /punters/cool-off" when {
    checkPermissions(Set(Active))(Post("punters/cool-off", TheCoolOffRequest) ~> authHeader) { allowedStatus =>
      "succeed on the happy path" in {
        Post("/punters/cool-off", TheCoolOffRequest) ~> authHeader ~> buildRoutesFor(allowedStatus) ~> check {
          Then("The response should be 'Ok'")
          status shouldEqual StatusCodes.OK
          jsonFieldDecoded[PunterId]("punterId") shouldBe defined
          jsonFieldDecoded[CoolOffPeriod]("coolOffPeriod") shouldBe defined
        }
      }
    }
  }

  "POST payments/withdrawal" when {
    val requestBody = parse(s""" {"amount": {"amount": 50, "currency": "USD"}} """).get

    checkPermissions(Set(Active, InCoolOff))(Post("payments/withdrawal", requestBody) ~> authHeader) { allowedStatus =>
      "succeed on the happy path" in {
        Post("payments/withdrawal", requestBody) ~> authHeader ~> buildRoutesFor(allowedStatus) ~> check {
          Then("The response should be 'Ok'")
          status shouldEqual StatusCodes.OK
        }
      }
    }
  }

  "POST payments/cash-withdrawal" when {
    val requestBody = parse(s""" {"amount": {"amount": 50, "currency": "USD"}} """).get
    val maybeCurrentSession = Some(
      StartedSession(SessionId.fromUUID(UUID.randomUUID()), clock.currentOffsetDateTime(), Some(generateIpAddress())))

    checkPermissions(Set(Active, InCoolOff))(Post("payments/cash-withdrawal", requestBody) ~> authHeader) {
      allowedStatus =>
        "succeed on the happy path" in {
          val (registeredUserKeycloak, punterProfile, punter) = userFor(allowedStatus)

          val authenticationRepository: TestAuthenticationRepository =
            testAuthenticationRepositoryWithFindUser(registeredUserKeycloak)
          val puntersRepository: InMemoryPuntersRepository = puntersRepositoryWithFind(punter)

          val routes = buildRoutes(
            puntersBoundedContext =
              new PuntersContextProviderSuccess(punterProfile.copy(maybeCurrentSession = maybeCurrentSession)),
            authenticationRepository = authenticationRepository,
            puntersRepository = puntersRepository).toAkkaHttp

          Post("payments/cash-withdrawal", requestBody) ~> authHeader ~> routes ~> check {
            Then("The response should be 'Ok'")
            status shouldEqual StatusCodes.OK
          }
        }
    }
  }

  "Routes" should {

    "return expected CORS headers in the response" when {
      val requestsToTest = Seq(
        Get("/punters/bets") ~> authHeader, // 200
        Get("/punters/bets"), // 401
        Get("/punters/bets") ~> invalidAuthHeader, // 401
        Get("/NON-EXISTENT"), // 404
        Post("/NON-EXISTENT"), // 404
        Put("/NON-EXISTENT"), // 404
        Put("/punters/bets") ~> authHeader // 405
      )

      "a request is made" in {
        forEvery(requestsToTest) { request =>
          val originHeader = Origin(randomElement(corsAllowedOrigins))
          request ~> originHeader ~> underTest ~> check {
            header[`Access-Control-Allow-Credentials`].value.allow shouldBe true

            header[`Access-Control-Allow-Origin`].value.range should matchPattern {
              case HttpOriginRange.Default(originHeader.origins) =>
            }

            header[`Access-Control-Expose-Headers`].value.headers shouldBe Seq(`Access-Control-Allow-Origin`.name)
          }
        }
      }
    }

    "return expected response to a CORS preflight request" when {
      val routeAndHeaders = Options("/punters/wallet/balance") ~>
        `Access-Control-Request-Method`(HttpMethods.GET) ~>
        `Access-Control-Request-Headers`(Origin.name)

      "origin is allowed" in {
        routeAndHeaders ~> Origin(randomElement(corsAllowedOrigins)) ~> underTest ~> check {
          status shouldBe StatusCodes.OK
        }
      }

      "origin is not allowed" in {
        routeAndHeaders ~> Origin(corsDisallowedOrigin) ~> underTest ~> check {
          status shouldBe StatusCodes.BadRequest
          responseAs[String] should startWith("CORS: invalid origin")
        }
      }
    }

    "return Unauthorized" when {
      "a GET request with invalid auth header is made to /punters/bets" in {
        Get("/punters/bets") ~> invalidAuthHeader ~> underTest ~> check {
          status shouldEqual StatusCodes.Unauthorized
        }
      }

      implicit val routesUnderTest: Route = underTest

      testUnauthorized("/punters/bets", Seq(Get))
      testUnauthorized("/punters/wallet/balance", Seq(Get))
      testUnauthorized("/punters/wallet/transactions", Seq(Get))
    }

    "return HTTP failure" when {

      "a POST request is made to /punters/deposit-limits but action fails" in {
        Post("/punters/deposit-limits", TheDepositLimitRequest) ~> authHeader ~> underTestFailureCases ~> check {
          status shouldEqual StatusCodes.Forbidden
        }
      }

      "a GET request is made to /sports/foo/fixtures/bar but action fails" in {
        Get("/sports/foo/fixtures/bar") ~> underTestFailureCases ~> check {
          status shouldEqual StatusCodes.NotFound
        }
      }

      "a GET request is made to /punters/wallet/balance but action fails" in {
        Get("/punters/wallet/balance") ~> authHeader ~> underTestFailureCases ~> check {
          status shouldEqual StatusCodes.NotFound
        }
      }

      "a GET request is made to /fixtures" in {
        Get("/fixtures") ~> underTestFailureCases ~> check {
          status shouldEqual StatusCodes.InternalServerError
        }
      }
    }
  }

  private def havingCurrentAndNextLimit(limits: Json): Assertion = {
    limits shouldHaveField ("current", { current =>
      current shouldHaveField ("limit", jsonFieldOfType[Json])
      current shouldHaveField ("since", jsonFieldOfType[OffsetDateTime])
    })
    limits shouldHaveField ("next", { next =>
      next shouldHaveField ("limit", jsonFieldOfType[Json])
      next shouldHaveField ("since", jsonFieldOfType[OffsetDateTime])
    })
  }

  private def havingUnlimitedCurrentLimit(limits: Json): Assertion = {
    limits shouldHaveField ("current", { current =>
      current shouldHaveField ("limit", _ should be(Json.Null))
      current shouldHaveField ("since", jsonFieldOfType[String])
    })
  }

  private def withPunterStatuses(allowed: Set[PunterStatus])(forbiddenAssert: PunterStatus => Unit)(
      successAssert: PunterStatus => Unit): Unit = {

    forAll(forbid(allowed.toSeq: _*)) { punterStatus =>
      s"punter is ${punterStatus.simpleObjectName}" should {
        "fail with Forbidden" in { forbiddenAssert(punterStatus) }
      }
    }

    forAll(allowed) { allowedStatus =>
      s"punter is ${allowedStatus.simpleObjectName}" should { successAssert(allowedStatus) }
    }
  }

  private def checkPermissions(allowed: Set[PunterStatus])(
      requestForForbidden: HttpRequest,
      routeBuilder: PunterStatus => Route = buildRoutesFor)(successAssert: PunterStatus => Unit): Unit =
    withPunterStatuses(allowed) {
      requestForForbidden ~> routeBuilder(_) ~> check {
        status shouldEqual StatusCodes.Forbidden
      }
    }(successAssert)

}

private object PhoenixRestRoutesSpec {
  val Active = PunterStatus.Active
  val Suspended = PunterStatus.Suspended(OperatorSuspend("bad boi"))
  val InCoolOff = PunterStatus.InCoolOff
  val SelfExcluded = PunterStatus.SelfExcluded
  val Deleted = PunterStatus.Deleted
  val Unverified = PunterStatus.Unverified
  val AllStatusesAllowed: Set[PunterStatus] = Set(Active, Suspended, InCoolOff, SelfExcluded, Deleted, Unverified)

  val clock = Clock.utcClock

  val ThePunterId = PunterId("69790b82-6c65-4ed9-91eb-b4ba0b8542a8")

  val betId = "bet123"
  val betData = generateBetData().copy(punterId = ThePunterId)

  val walletFundsRequest = DefaultCurrencyMoney(100)

  val TheCoolOffRequest = parse("""{"duration": {"length": 10, "unit": "DAYS"}}""").get

  val TheDepositLimitRequest = parse("""{"daily": 1099, "weekly": 10099, "monthly": 100099}""").get

  val marketsJson =
    """{
      "currentPage":1,
      "data":[{
        "marketId":"market123",
        "fixtureId":"fixture123",
        "name":"someMarketName",
        "selectionOdds":[],
        "sportId":"sport123"
      }],
      "hasNextPage":true,
      "itemsPerPage":1,
      "totalCount":100
    }""".replaceAll("[ \n]", "")

  val authHeader = Authorization(OAuth2BearerToken(punterToken.rawValue))
  val invalidAuthHeader = Authorization(OAuth2BearerToken(invalidToken.rawValue))

  val geolocationHeader = new Geolocation("dummy_value")
  def devDomainHeader(value: String) = new DevDomain(value)
  def forbid(elems: PunterStatus*): Set[PunterStatus] = AllStatusesAllowed -- Set.from(elems)
}

private final class Geolocation(value: String) extends ModeledCustomHeader[Geolocation] {
  override val companion: Geolocation.type = Geolocation

  override def renderInRequests = true

  override def renderInResponses = true

  override def value: String = value
}
private object Geolocation extends ModeledCustomHeaderCompanion[Geolocation] {
  override val name = "X-Geolocation"
  override def parse(value: String): Try[Geolocation] = Try(new Geolocation(value))
}

private final class DevDomain(value: String) extends ModeledCustomHeader[DevDomain] {
  override val companion: DevDomain.type = DevDomain
  override def renderInRequests = true
  override def renderInResponses = true
  override def value: String = value
}
private object DevDomain extends ModeledCustomHeaderCompanion[DevDomain] {
  override val name = "X-Dev-Domain"
  override def parse(value: String): Try[DevDomain] = Try(new DevDomain(value))
}
private final class RemoteAddress(value: String) extends ModeledCustomHeader[RemoteAddress] {
  override val companion: RemoteAddress.type = RemoteAddress
  override def renderInRequests = true
  override def renderInResponses = true
  override def value: String = value
}
private object RemoteAddress extends ModeledCustomHeaderCompanion[RemoteAddress] {
  val LocalHost: RemoteAddress = RemoteAddress("127.0.0.1")

  override val name = "Remote-Address"
  override def parse(value: String): Try[RemoteAddress] = Try(new RemoteAddress(value))
}
