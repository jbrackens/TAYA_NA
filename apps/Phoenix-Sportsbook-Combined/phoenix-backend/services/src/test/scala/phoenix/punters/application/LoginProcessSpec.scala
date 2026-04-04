package phoenix.punters.application

import scala.concurrent.Future

import cats.data.EitherT
import org.scalatest.concurrent.Eventually
import org.scalatest.matchers.should.Matchers
import org.scalatest.time.Seconds
import org.scalatest.time.Span
import org.scalatest.wordspec.AnyWordSpec

import phoenix.bets.support.BetsBoundedContextMock
import phoenix.boundedcontexts.wallet.WalletContextProviderSuccess
import phoenix.core.emailing.EmailSenderStub
import phoenix.core.emailing.EmailingModule
import phoenix.core.scheduler.SchedulerModule
import phoenix.http.core.IpAddress
import phoenix.punters.ActorPuntersBoundedContext
import phoenix.punters.PunterDataGenerator.generateRegisteredUserKeycloak
import phoenix.punters.PunterEntity.PunterId
import phoenix.punters.PuntersBoundedContext
import phoenix.punters.PuntersConfig
import phoenix.punters.application.LoginProcess.LoginProcessError.PunterProfileNotFound
import phoenix.punters.domain.AuthenticationRepository
import phoenix.punters.domain.Confidence
import phoenix.punters.domain.DeviceFingerprint
import phoenix.punters.domain.Limits
import phoenix.punters.domain.PunterSettings
import phoenix.punters.domain.PuntersRepositoryErrors
import phoenix.punters.domain.RegisteredUserKeycloak
import phoenix.punters.domain.TermsAcceptedVersion
import phoenix.punters.domain.TermsAgreement
import phoenix.punters.domain.Username
import phoenix.punters.domain.VisitorId
import phoenix.punters.exclusion.support.InMemoryExcludedPlayersRepository
import phoenix.punters.infrastructure.SlickPunterDeviceFingerprintsRepository
import phoenix.punters.infrastructure.SlickPunterTimeRestrictedSessionsRepository
import phoenix.punters.support.InMemoryPuntersRepository
import phoenix.punters.support.TermsAndConditionsRepositoryMock
import phoenix.punters.support.TestAuthenticationRepository
import phoenix.support.ActorSystemIntegrationSpec
import phoenix.support.ConstantUUIDGenerator
import phoenix.support.DatabaseIntegrationSpec
import phoenix.support.FutureSupport
import phoenix.support.UnsafeValueObjectExtensions.UnsafeUsernameOps
import phoenix.time.FakeHardcodedClock
import phoenix.utils.RandomUUIDGenerator
import phoenix.wallets.WalletProjectionRunner

class LoginProcessSpec
    extends AnyWordSpec
    with Matchers
    with FutureSupport
    with ActorSystemIntegrationSpec
    with DatabaseIntegrationSpec
    with Eventually {

  implicit val eventuallyPatience = PatienceConfig(scaled(Span(30, Seconds)), scaled(Span(1, Seconds)))

  implicit val clock = new FakeHardcodedClock()
  val schedulerModule: SchedulerModule = SchedulerModule.init(clock)(system)

  val authenticationRepository: AuthenticationRepository = new TestAuthenticationRepository() {
    override def findUser(userId: AuthenticationRepository.UserLookupId): Future[Option[RegisteredUserKeycloak]] =
      Future.successful(Some(generateRegisteredUserKeycloak()))
  }

  val punterTimeRestrictedSessionRepository = new SlickPunterTimeRestrictedSessionsRepository(dbConfig)

  val uuidGenerator = ConstantUUIDGenerator

  val termsAndConditionsRepository = new TermsAndConditionsRepositoryMock()

  val deviceFingerprintsRepository = new SlickPunterDeviceFingerprintsRepository(dbConfig, clock)

  val puntersRepository = new InMemoryPuntersRepository() {
    override def updateSettings(punterId: PunterId, update: PunterSettings => PunterSettings)
        : EitherT[Future, PuntersRepositoryErrors.ChangePunterSettingsError, Unit] = EitherT.right(Future.unit)
  }

  val puntersBC: PuntersBoundedContext = ActorPuntersBoundedContext(
    PuntersConfig.of(system),
    system,
    authenticationRepository,
    new WalletContextProviderSuccess(clock),
    BetsBoundedContextMock.betsWithDomainFailureMock,
    EmailingModule.init(new EmailSenderStub()).mailer,
    new TermsAndConditionsRepositoryMock(),
    new InMemoryExcludedPlayersRepository(),
    new InMemoryPuntersRepository(),
    dbConfig,
    clock,
    schedulerModule.akkaJobScheduler,
    RandomUUIDGenerator,
    WalletProjectionRunner.build(system, dbConfig))

  val loginProcess =
    new LoginProcess(
      puntersBC,
      authenticationRepository,
      termsAndConditionsRepository,
      deviceFingerprintsRepository,
      puntersRepository,
      uuidGenerator,
      clock)

  "Login Process" should {
    "start tracking refresh token timeout" in {
      // given
      val punterId = PunterId(RandomUUIDGenerator.generate().toString)
      awaitRight(
        puntersBC
          .createUnverifiedPunterProfile(punterId, Limits.none, Limits.none, Limits.none, None, isTestAccount = false))

      // when
      val loggedIn = awaitRight(
        loginProcess.login(
          punterId,
          Username.fromStringUnsafe("username"),
          MaybeValidPassword("password"),
          TermsAgreement(TermsAcceptedVersion(1), clock.currentOffsetDateTime()),
          None,
          DeviceFingerprint(VisitorId.unsafe("jp2"), Confidence.unsafe(0.55f)),
          IpAddress("10.0.0.1")))

      // then
      eventually {
        val queriedTimestamp =
          clock.currentOffsetDateTime().plusSeconds(loggedIn.token.refreshExpiresIn).plusSeconds(31)
        val expectedTimeout = clock.currentOffsetDateTime().plusSeconds(loggedIn.token.refreshExpiresIn).plusSeconds(30)
        val result = await(punterTimeRestrictedSessionRepository.findInvalidSessions(queriedTimestamp))
        result.head.refreshTokenTimeout should ===(expectedTimeout)
      }
    }

    "return error if punter is not registered" in {
      // given
      val punterId = PunterId(RandomUUIDGenerator.generate().toString)

      // when
      val error = awaitLeft(
        loginProcess.login(
          punterId,
          Username.fromStringUnsafe("username"),
          MaybeValidPassword("password"),
          TermsAgreement(TermsAcceptedVersion(1), clock.currentOffsetDateTime()),
          None,
          DeviceFingerprint(VisitorId.unsafe("jp2gmd"), Confidence.unsafe(0.55f)),
          IpAddress("10.0.0.1")))

      // then
      error shouldBe PunterProfileNotFound
    }
  }
}
