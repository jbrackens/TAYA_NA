package phoenix.punters

import java.time.Duration

import scala.concurrent.ExecutionContext
import scala.concurrent.Future
import scala.concurrent.duration.DurationInt
import scala.concurrent.duration.FiniteDuration
import scala.concurrent.duration.MILLISECONDS
import scala.concurrent.duration.SECONDS

import cats.data.EitherT
import org.scalatest.Inside
import org.scalatest.concurrent.Eventually
import org.scalatest.concurrent.PatienceConfiguration.Timeout
import org.scalatest.matchers.should.Matchers
import org.scalatest.wordspec.AnyWordSpecLike

import phoenix.bets.support.BetsBoundedContextMock
import phoenix.boundedcontexts.wallet.WalletContextProviderSuccess
import phoenix.core.Clock
import phoenix.core.emailing.EmailSenderStub
import phoenix.core.emailing.EmailingModule
import phoenix.core.scheduler.SchedulerModule
import phoenix.punters.PunterDataGenerator.Api._
import phoenix.punters.PunterDataGenerator.createDepositLimitAmount
import phoenix.punters.PunterDataGenerator.createStakeLimitAmount
import phoenix.punters.PunterDataGenerator.generateRegisteredUserKeycloak
import phoenix.punters.PunterEntity.PunterId
import phoenix.punters.PunterProtocol.ReferralCode
import phoenix.punters.PunterState.ActivationPath
import phoenix.punters.PunterState.EndedSession
import phoenix.punters.PunterState.SelfExclusionDuration
import phoenix.punters.PunterState.SelfExclusionOrigin
import phoenix.punters.PuntersBoundedContext._
import phoenix.punters.domain.AuthenticationRepository
import phoenix.punters.domain.CoolOffCause
import phoenix.punters.domain.CoolOffPeriod
import phoenix.punters.domain.DepositLimitAmount
import phoenix.punters.domain.Limit
import phoenix.punters.domain.Limits
import phoenix.punters.domain.PunterProfile
import phoenix.punters.domain.PunterStatus
import phoenix.punters.domain.PunterStatus.InCoolOff
import phoenix.punters.domain.RegisteredUserKeycloak
import phoenix.punters.domain.SessionDuration
import phoenix.punters.domain.SessionLimitation.Limited
import phoenix.punters.domain.SessionLimitation.Unlimited
import phoenix.punters.domain.SessionLimits
import phoenix.punters.domain.StakeLimitAmount
import phoenix.punters.domain.SuspensionEntity.NegativeBalance
import phoenix.punters.domain.SuspensionEntity.OperatorSuspend
import phoenix.punters.exclusion.support.InMemoryExcludedPlayersRepository
import phoenix.punters.infrastructure.SlickPunterTimeRestrictedSessionsRepository
import phoenix.punters.support.AccountVerificationCodeRepositoryStub
import phoenix.punters.support.InMemoryPuntersRepository
import phoenix.punters.support.LimitHelpers
import phoenix.punters.support.TermsAndConditionsRepositoryMock
import phoenix.punters.support.TestAuthenticationRepository
import phoenix.support.ActorSystemIntegrationSpec
import phoenix.support.DataGenerator._
import phoenix.support.DatabaseIntegrationSpec
import phoenix.support.FutureSupport
import phoenix.support.UnsafeValueObjectExtensions._
import phoenix.utils.RandomUUIDGenerator
import phoenix.wallets.WalletProjectionRunner

final class ActorPuntersBoundedContextSpec
    extends AnyWordSpecLike
    with Matchers
    with FutureSupport
    with Eventually
    with ActorSystemIntegrationSpec
    with DatabaseIntegrationSpec
    with Inside {

  private val eventuallyTimeout = Timeout(awaitTimeout.value * 10)
  private val eventuallyInterval = awaitInterval

  implicit val clock: Clock = Clock.utcClock
  val schedulerModule: SchedulerModule = SchedulerModule.init(clock)(system)
  val accountVerificationCodeRepository = new AccountVerificationCodeRepositoryStub(clock)()
  val punterTimeRestrictedSessionRepository = new SlickPunterTimeRestrictedSessionsRepository(dbConfig)
  val authenticationRepository = new TestAuthenticationRepository() {
    override def findUser(userId: AuthenticationRepository.UserLookupId): Future[Option[RegisteredUserKeycloak]] =
      Future.successful(Some(generateRegisteredUserKeycloak()))
  }
  val punters: PuntersBoundedContext = ActorPuntersBoundedContext(
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

  private val suspensionEntity = OperatorSuspend("bad boi")
  private val negativeBalanceSuspensionEntity = NegativeBalance("Negative balance Reason")
  def dateInTheFuture = clock.currentOffsetDateTime().plusMonths(10)

  "Creating punter profile" should {
    "be able to create punter profile, with no initial limits" in {

      // given
      val punterId = generatePunterId()

      // when
      val punterProfile = awaitRight(createUnverifiedPunterProfile(punterId))

      // then
      punterProfile.depositLimits shouldBe LimitHelpers.noPeriodicLimits[DepositLimitAmount]
      punterProfile.stakeLimits shouldBe LimitHelpers.noPeriodicLimits[StakeLimitAmount]
      punterProfile.sessionLimits shouldBe LimitHelpers.noPeriodicLimits[SessionDuration]
    }

    "fail to create punter profile twice" in {
      // given
      val punterId = generatePunterId()
      awaitRight(createUnverifiedPunterProfile(punterId))

      // when
      val attempt = awaitLeft(createUnverifiedPunterProfile(punterId))

      // then
      attempt shouldBe a[PunterProfileAlreadyExists]
    }
  }

  "Getting punter profile" should {
    "return existing punter profile" in {
      // given
      val punterId = generatePunterId()
      val depositLimits = Limits.unsafe(
        Limit.Daily(Some(createDepositLimitAmount(21))),
        Limit.Weekly(Some(createDepositLimitAmount(37))),
        Limit.Monthly(Some(createDepositLimitAmount(2137))))
      val sessionLimits = Limits.unsafe(
        SessionLimits.Daily.unsafe(SessionDuration(3.hours)),
        SessionLimits.Weekly.unsafe(SessionDuration(10.hours)),
        SessionLimits.Monthly.unsafe(SessionDuration(30.hours)))
      val stakeLimits = Limits.unsafe(
        Limit.Daily(Some(createStakeLimitAmount(100))),
        Limit.Weekly(Some(createStakeLimitAmount(300))),
        Limit.Monthly(Some(createStakeLimitAmount(1500))))
      val isTestAccount = randomBoolean()

      // and
      awaitRight(
        punters.createUnverifiedPunterProfile(
          punterId,
          depositLimits = depositLimits,
          sessionLimits = sessionLimits,
          stakeLimits = stakeLimits,
          referralCode = None,
          isTestAccount = isTestAccount))

      // when
      val profile = awaitRight(punters.getPunterProfile(punterId))

      profile.depositLimits.daily.current.limit shouldBe depositLimits.daily
      profile.depositLimits.weekly.current.limit shouldBe depositLimits.weekly
      profile.depositLimits.monthly.current.limit shouldBe depositLimits.monthly
      profile.sessionLimits.daily.current.limit shouldBe sessionLimits.daily
      profile.sessionLimits.weekly.current.limit shouldBe sessionLimits.weekly
      profile.sessionLimits.monthly.current.limit shouldBe sessionLimits.monthly
      profile.stakeLimits.daily.current.limit shouldBe stakeLimits.daily
      profile.stakeLimits.weekly.current.limit shouldBe stakeLimits.weekly
      profile.stakeLimits.monthly.current.limit shouldBe stakeLimits.monthly
      profile.status shouldBe PunterStatus.Unverified
      profile.exclusionStatus shouldBe None
      profile.isTestAccount shouldBe isTestAccount
      profile.endedSessions shouldBe List.empty
      profile.maybeCurrentSession shouldBe None
      profile.passwordResetRequired shouldBe false
    }

    "throw an error when getting non existing punter profile" in {
      // when
      val attempt = awaitLeft(punters.getPunterProfile(generatePunterId()))

      // then
      attempt shouldBe a[PunterProfileDoesNotExist]
    }
  }

  "Verifying punter profile" should {
    "store the ActivationPath in the PunterState" in {
      // given
      val punterId = generatePunterId()
      val activationPath: ActivationPath = PunterDataGenerator.randomActivationPath()

      awaitRight(createUnverifiedPunterProfile(punterId))

      // when
      punters.verifyPunter(punterId, activationPath)

      // then
      val punterProfile: PunterProfile = awaitRight(punters.getPunterProfile(punterId))
      punterProfile.activationPath shouldBe Some(activationPath)
    }
  }

  "Starting punter cool-off period" should {
    "begin a cool-off period" in {
      // given
      val punterId = generatePunterId()
      val coolOffCause = randomEnumValue[CoolOffCause]()
      awaitRight(createDefaultPunterProfile(punterId))

      // when
      val duration = generateCoolOffDuration()
      awaitRight(punters.beginCoolOff(punterId, duration, coolOffCause))

      // then
      val punterProfile = awaitRight(punters.getPunterProfile(punterId))
      punterProfile.status shouldBe PunterStatus.InCoolOff
      durationOf(punterProfile.exclusionStatus.get.period) shouldBe duration
      punterProfile.exclusionStatus.get.cause shouldBe coolOffCause
    }

    "fail on unknown punter" in {
      // when
      val attempt =
        awaitLeft(punters.beginCoolOff(generatePunterId(), generateCoolOffDuration(), CoolOffCause.SelfInitiated))

      // then
      attempt shouldBe a[PunterProfileDoesNotExist]
    }

    "fail on already cooled-off punter" in {
      // given
      val punterId = generatePunterId()
      awaitRight(createDefaultPunterProfile(punterId))

      // and
      awaitRight(punters.beginCoolOff(punterId, generateCoolOffDuration(), CoolOffCause.SelfInitiated))

      // when
      val attempt = awaitLeft(punters.beginCoolOff(punterId, generateCoolOffDuration(), CoolOffCause.SelfInitiated))

      // then
      attempt shouldBe a[PunterInCoolOffError]
    }

    "fail on already automated cooled-off punter" in {
      // given
      val punterId = generatePunterId()
      awaitRight(createDefaultPunterProfile(punterId))

      // and
      awaitRight(punters.beginCoolOff(punterId, generateCoolOffDuration(), CoolOffCause.SessionLimitBreach))

      // when
      val attempt =
        awaitLeft(punters.beginCoolOff(punterId, generateCoolOffDuration(), CoolOffCause.SessionLimitBreach))

      // then
      attempt shouldBe a[PunterInCoolOffError]
    }

    "begin an automated cool-off period" in {
      // given
      val punterId = generatePunterId()
      awaitRight(createDefaultPunterProfile(punterId))

      // when
      val duration = generateCoolOffDuration()
      awaitRight(punters.beginCoolOff(punterId, duration, CoolOffCause.SessionLimitBreach))

      // then
      val punterProfile = awaitRight(punters.getPunterProfile(punterId))
      punterProfile.status shouldBe PunterStatus.InCoolOff
      durationOf(punterProfile.exclusionStatus.get.period) shouldBe duration
      punterProfile.exclusionStatus.get.cause shouldBe CoolOffCause.SessionLimitBreach
    }

  }

  "Begin self exclusion" should {
    "change the punter status successfully on active punters" in {
      // given
      val punterId = generatePunterId()
      awaitRight(createDefaultPunterProfile(punterId))

      // when
      awaitRight(punters.beginSelfExclusion(punterId, SelfExclusionOrigin.Internal(SelfExclusionDuration.FiveYears)))

      // then
      val punterProfile = awaitRight(punters.getPunterProfile(punterId))
      punterProfile.status shouldBe PunterStatus.SelfExcluded
      punterProfile.exclusionStatus shouldBe None
    }

    "fail on unknown punter" in {
      // when
      val attempt = awaitLeft(punters.beginSelfExclusion(generatePunterId(), SelfExclusionOrigin.External))

      // then
      attempt shouldBe a[PunterProfileDoesNotExist]
    }

    "fail on already self excluded punter" in {
      // given
      val punterId = generatePunterId()
      awaitRight(createDefaultPunterProfile(punterId))

      // and
      awaitRight(punters.beginSelfExclusion(punterId, SelfExclusionOrigin.External))

      // when
      val attempt =
        awaitLeft(punters.beginSelfExclusion(punterId, SelfExclusionOrigin.Internal(SelfExclusionDuration.OneYear)))

      // then
      attempt shouldBe a[PunterInSelfExclusionError]
    }

    "succeed on punters being in a cool off period" in {
      // given
      val punterId = generatePunterId()
      awaitRight(createDefaultPunterProfile(punterId))

      // and
      awaitRight(punters.beginCoolOff(punterId, generateCoolOffDuration(), CoolOffCause.SelfInitiated))

      // when
      awaitRight(punters.beginSelfExclusion(punterId, SelfExclusionOrigin.External))

      // then
      val punterProfile = awaitRight(punters.getPunterProfile(punterId))
      punterProfile.status shouldBe PunterStatus.SelfExcluded
      punterProfile.exclusionStatus shouldBe None
    }

    "succeed on suspended punter profiles" in {
      // given
      val punterId = generatePunterId()
      awaitRight(createDefaultPunterProfile(punterId))

      // and
      awaitRight(punters.suspend(punterId, suspensionEntity, suspendedAt = randomOffsetDateTime()))

      // when
      awaitRight(punters.beginSelfExclusion(punterId, SelfExclusionOrigin.Internal(SelfExclusionDuration.FiveYears)))

      // then
      val punterProfile = awaitRight(punters.getPunterProfile(punterId))
      punterProfile.status shouldBe PunterStatus.SelfExcluded
      punterProfile.exclusionStatus shouldBe None
    }
  }

  "Ending self exclusion" should {
    "set the punter as active when the punter is in self-exclusion" in {
      // given
      val punterId = generatePunterId()
      awaitRight(createDefaultPunterProfile(punterId))
      awaitRight(punters.beginSelfExclusion(punterId, SelfExclusionOrigin.Internal(SelfExclusionDuration.FiveYears)))

      // when
      awaitRight(punters.endSelfExclusion(punterId))

      // then
      val punterProfile = awaitRight(punters.getPunterProfile(punterId))
      punterProfile.status shouldBe PunterStatus.Active
      punterProfile.exclusionStatus shouldBe None
    }

    "fail if the punter does not exist" in {
      // when
      val attempt = awaitLeft(punters.beginSelfExclusion(generatePunterId(), SelfExclusionOrigin.External))

      // then
      attempt shouldBe a[PunterProfileDoesNotExist]
    }

    "fail if the punter is suspended" in {
      // given
      val punterId = generatePunterId()
      awaitRight(createDefaultPunterProfile(punterId))

      // and
      awaitRight(punters.suspend(punterId, suspensionEntity, suspendedAt = randomOffsetDateTime()))

      // when
      val attempt = awaitLeft(punters.endSelfExclusion(punterId))

      // then
      attempt shouldBe a[PunterSuspendedError]
    }

    "fail if the punter is not suspended and not in self-exclusion" in {
      // given
      val punterInCoolOff = generatePunterId()
      awaitRight(createDefaultPunterProfile(punterInCoolOff))
      awaitRight(punters.beginCoolOff(punterInCoolOff, generateCoolOffDuration(), CoolOffCause.SelfInitiated))

      // when
      val attempt = awaitLeft(punters.endSelfExclusion(punterInCoolOff))

      // then
      attempt shouldBe a[PunterNotInSelfExclusionError]
    }
  }

  "Ending punter cool off period" should {
    "end a cool-off period" in {
      // given
      val punterId = generatePunterId()
      awaitRight(createDefaultPunterProfile(punterId))

      // and
      awaitRight(punters.beginCoolOff(punterId, generateCoolOffDuration(), CoolOffCause.SelfInitiated))

      // when
      awaitRight(punters.endCoolOff(punterId))

      // then
      val punterProfile = awaitRight(punters.getPunterProfile(punterId))
      punterProfile.exclusionStatus shouldBe None
      punterProfile.status shouldBe PunterStatus.Active
    }

    "fail if the punter is self-excluded" in {
      // given
      val punterId = generatePunterId()
      awaitRight(createDefaultPunterProfile(punterId))

      // and
      awaitRight(punters.beginSelfExclusion(punterId, SelfExclusionOrigin.Internal(SelfExclusionDuration.OneYear)))

      // then
      awaitLeft(punters.endCoolOff(punterId)) shouldBe PunterInSelfExclusionError(punterId)
    }

    "should happen automatically once cool-off period elapses" in {
      // given
      val punterId = generatePunterId()
      awaitRight(createDefaultPunterProfile(punterId))

      // and
      awaitRight(punters.beginCoolOff(punterId, FiniteDuration(1, MILLISECONDS), CoolOffCause.SelfInitiated))

      // then
      eventually(eventuallyTimeout, eventuallyInterval) {
        val punterProfile = awaitRight(punters.getPunterProfile(punterId))
        punterProfile.exclusionStatus shouldBe None
        punterProfile.status shouldBe PunterStatus.Active
      }
    }

    "fail on unknown punter" in {
      // when
      val attempt = awaitLeft(punters.endCoolOff(generatePunterId()))

      // then
      attempt shouldBe a[PunterProfileDoesNotExist]
    }

    "fail on punter not being cooling off" in {
      // given
      val punterId = generatePunterId()
      awaitRight(createDefaultPunterProfile(punterId))

      // when
      val attempt = awaitLeft(punters.endCoolOff(punterId))

      // then
      attempt shouldBe a[PunterNotInCoolOffError]
    }

    "end an automated cool-off period" in {
      // given
      val punterId = generatePunterId()
      awaitRight(createDefaultPunterProfile(punterId))

      // and
      awaitRight(punters.beginCoolOff(punterId, generateCoolOffDuration(), CoolOffCause.SessionLimitBreach))

      // when
      awaitRight(punters.endCoolOff(punterId))

      // then
      val punterProfile = awaitRight(punters.getPunterProfile(punterId))
      punterProfile.exclusionStatus shouldBe None
      punterProfile.status shouldBe PunterStatus.Active
    }
  }

  "Keeping alive the session" should {
    "return an error if the punter doesn't exist" in {
      val punterId = generatePunterId()

      val error = awaitLeft(punters.keepaliveSession(punterId, clock.currentOffsetDateTime()))

      error shouldBe PunterProfileDoesNotExist(punterId)
    }

    "perform the keepalive if punter is unverified" in {
      // given
      val punterId = generatePunterId()

      awaitRight(
        punters.createUnverifiedPunterProfile(
          punterId,
          depositLimits = Limits.none,
          stakeLimits = Limits.none,
          sessionLimits = Limits.none,
          referralCode = None,
          isTestAccount = false))

      val tokenTimeout = clock.currentOffsetDateTime()
      awaitRight(punters.startSession(punterId, SessionId(randomUUID().toString), tokenTimeout, ipAddress = None))

      // when
      awaitRight(punters.keepaliveSession(punterId, tokenTimeout.plusMinutes(30)))

      // then
      eventually(eventuallyTimeout, eventuallyInterval) {
        val queriedTimestamp = clock.currentOffsetDateTime().plusYears(100)
        val expectedTimestamp = tokenTimeout.plusMinutes(30)
        val result = await(punterTimeRestrictedSessionRepository.findInvalidSessions(queriedTimestamp))
        result.filter(_.punterId == punterId).head.refreshTokenTimeout === (expectedTimestamp)
      }
    }

    "perform the keepalive if punter is active" in {
      // given
      val punterId = generatePunterId()

      awaitRight(
        createActivePunterProfile(
          punterId,
          depositLimits = Limits.none,
          stakeLimits = Limits.none,
          sessionLimits = Limits.none,
          referralCode = None,
          isTestAccount = false))

      val tokenTimeout = clock.currentOffsetDateTime()
      awaitRight(punters.startSession(punterId, SessionId(randomUUID().toString), tokenTimeout, ipAddress = None))

      // when
      awaitRight(punters.keepaliveSession(punterId, tokenTimeout.plusMinutes(30)))

      // then
      eventually(eventuallyTimeout, eventuallyInterval) {
        val queriedTimestamp = clock.currentOffsetDateTime().plusYears(100)
        val expectedTimestamp = tokenTimeout.plusMinutes(30)
        val result = await(punterTimeRestrictedSessionRepository.findInvalidSessions(queriedTimestamp))
        result.filter(_.punterId == punterId).head.refreshTokenTimeout === (expectedTimestamp)
      }
    }

    "perform the keepalive if punter is in cool off" in {
      // given
      val punterId = generatePunterId()

      awaitRight(createDefaultPunterProfile(punterId))

      awaitRight(punters.beginCoolOff(punterId, generateCoolOffDuration(), CoolOffCause.SelfInitiated))

      val tokenTimeout = clock.currentOffsetDateTime()
      awaitRight(punters.startSession(punterId, SessionId(randomUUID().toString), tokenTimeout, ipAddress = None))

      // when
      awaitRight(punters.keepaliveSession(punterId, tokenTimeout.plusMinutes(30)))

      // then
      eventually(eventuallyTimeout, eventuallyInterval) {
        val queriedTimestamp = clock.currentOffsetDateTime().plusYears(100)
        val expectedTimestamp = tokenTimeout.plusMinutes(30)
        val result = await(punterTimeRestrictedSessionRepository.findInvalidSessions(queriedTimestamp))
        result.filter(_.punterId == punterId).head.refreshTokenTimeout === (expectedTimestamp)
      }
    }

    "return error if the punter is suspended" in {
      // given
      val punterId = generatePunterId()

      awaitRight(createDefaultPunterProfile(punterId))

      awaitRight(punters.suspend(punterId, suspensionEntity, suspendedAt = randomOffsetDateTime()))

      // when
      val tokenTimeout = clock.currentOffsetDateTime()
      val error = awaitLeft(punters.keepaliveSession(punterId, tokenTimeout))

      // then
      error shouldBe PunterSuspendedError(punterId)
    }
  }

  "Setting a deposit limit" should {

    "apply a deposit limit immediately when punter is first created" in {
      // given
      val punterId = generatePunterId()
      val initialDepositLimits = Limits.unsafe(
        Limit.Daily(Some(createDepositLimitAmount(3))),
        Limit.Weekly(Some(createDepositLimitAmount(10))),
        Limit.Monthly(Some(createDepositLimitAmount(30))))

      awaitRight(
        punters.createUnverifiedPunterProfile(
          punterId,
          depositLimits = initialDepositLimits,
          stakeLimits = Limits.none,
          sessionLimits = Limits.none,
          referralCode = None,
          isTestAccount = false))

      // then
      val punterProfile = awaitRight(punters.getPunterProfile(punterId))

      punterProfile.depositLimits.daily.current.limit shouldBe initialDepositLimits.daily
      punterProfile.depositLimits.weekly.current.limit shouldBe initialDepositLimits.weekly
      punterProfile.depositLimits.monthly.current.limit shouldBe initialDepositLimits.monthly
    }

    "decrease deposit limits immediately" in {
      // given
      val punterId = generatePunterId()
      val initialDepositLimits = Limits.unsafe(
        Limit.Daily(Some(createDepositLimitAmount(10))),
        Limit.Weekly(Some(createDepositLimitAmount(20))),
        Limit.Monthly(Some(createDepositLimitAmount(30))))
      awaitRight(
        createActivePunterProfile(
          punterId,
          depositLimits = initialDepositLimits,
          stakeLimits = Limits.none,
          sessionLimits = Limits.none,
          referralCode = None,
          isTestAccount = false))

      // when
      val decreasedLimits = Limits.unsafe(
        Limit.Daily(Some(createDepositLimitAmount(1))),
        Limit.Weekly(Some(createDepositLimitAmount(2))),
        Limit.Monthly(Some(createDepositLimitAmount(3))))

      awaitRight(punters.setDepositLimits(punterId, decreasedLimits))

      // then
      val punterProfile = awaitRight(punters.getPunterProfile(punterId))

      punterProfile.depositLimits.daily.current.limit shouldBe decreasedLimits.daily
      punterProfile.depositLimits.weekly.current.limit shouldBe decreasedLimits.weekly
      punterProfile.depositLimits.monthly.current.limit shouldBe decreasedLimits.monthly
    }

    "increase deposit limits from next period" in {
      // given
      val punterId = generatePunterId()
      val initialDepositLimits = Limits.unsafe(
        Limit.Daily(Some(createDepositLimitAmount(3))),
        Limit.Weekly(Some(createDepositLimitAmount(10))),
        Limit.Monthly(Some(createDepositLimitAmount(30))))
      awaitRight(
        createActivePunterProfile(
          punterId,
          depositLimits = initialDepositLimits,
          stakeLimits = Limits.none,
          sessionLimits = Limits.none,
          referralCode = None,
          isTestAccount = false))

      // when
      val increasedLimits = Limits.unsafe(
        Limit.Daily(Some(createDepositLimitAmount(6))),
        Limit.Weekly(Some(createDepositLimitAmount(20))),
        Limit.Monthly(Some(createDepositLimitAmount(60))))

      awaitRight(punters.setDepositLimits(punterId, increasedLimits))

      // then
      val punterProfile = awaitRight(punters.getPunterProfile(punterId))

      punterProfile.depositLimits.daily.current.limit shouldBe initialDepositLimits.daily
      punterProfile.depositLimits.daily.next.get.limit shouldBe increasedLimits.daily
      punterProfile.depositLimits.weekly.current.limit shouldBe initialDepositLimits.weekly
      punterProfile.depositLimits.weekly.next.get.limit shouldBe increasedLimits.weekly
      punterProfile.depositLimits.monthly.current.limit shouldBe initialDepositLimits.monthly
      punterProfile.depositLimits.monthly.next.get.limit shouldBe increasedLimits.monthly
    }

    "increase deposit limits then decrease to a lower than current should hold only decreased amount and apply immediately" in {
      // given
      val punterId = generatePunterId()
      val initialDepositLimits = Limits.unsafe(
        Limit.Daily(Some(createDepositLimitAmount(10))),
        Limit.Weekly(Some(createDepositLimitAmount(20))),
        Limit.Monthly(Some(createDepositLimitAmount(30))))
      awaitRight(
        createActivePunterProfile(
          punterId,
          depositLimits = initialDepositLimits,
          stakeLimits = Limits.none,
          sessionLimits = Limits.none,
          referralCode = None,
          isTestAccount = false))
      // and
      val increasedLimits = Limits.unsafe(
        Limit.Daily(Some(createDepositLimitAmount(20))),
        Limit.Weekly(Some(createDepositLimitAmount(30))),
        Limit.Monthly(Some(createDepositLimitAmount(40))))

      awaitRight(punters.setDepositLimits(punterId, increasedLimits))

      // when
      val decreasedLimits = Limits.unsafe(
        Limit.Daily(Some(createDepositLimitAmount(1))),
        Limit.Weekly(Some(createDepositLimitAmount(2))),
        Limit.Monthly(Some(createDepositLimitAmount(3))))

      awaitRight(punters.setDepositLimits(punterId, decreasedLimits))

      // then
      val punterProfile = awaitRight(punters.getPunterProfile(punterId))

      punterProfile.depositLimits.daily.current.limit shouldBe decreasedLimits.daily
      punterProfile.depositLimits.weekly.current.limit shouldBe decreasedLimits.weekly
      punterProfile.depositLimits.monthly.current.limit shouldBe decreasedLimits.monthly

      punterProfile.depositLimits.daily.next shouldBe None
      punterProfile.depositLimits.weekly.next shouldBe None
      punterProfile.depositLimits.monthly.next shouldBe None
    }

    "increase deposit limits then decrease to a higher than current should override limit in next period" in {
      // given
      val punterId = generatePunterId()
      val initialDepositLimits = Limits.unsafe(
        Limit.Daily(Some(createDepositLimitAmount(10))),
        Limit.Weekly(Some(createDepositLimitAmount(20))),
        Limit.Monthly(Some(createDepositLimitAmount(30))))
      awaitRight(
        createActivePunterProfile(
          punterId,
          depositLimits = initialDepositLimits,
          stakeLimits = Limits.none,
          sessionLimits = Limits.none,
          referralCode = None,
          isTestAccount = false))
      // and
      val increasedLimits = Limits.unsafe(
        Limit.Daily(Some(createDepositLimitAmount(200))),
        Limit.Weekly(Some(createDepositLimitAmount(300))),
        Limit.Monthly(Some(createDepositLimitAmount(400))))

      awaitRight(punters.setDepositLimits(punterId, increasedLimits))

      // when
      val decreasedLimits = Limits.unsafe(
        Limit.Daily(Some(createDepositLimitAmount(100))),
        Limit.Weekly(Some(createDepositLimitAmount(200))),
        Limit.Monthly(Some(createDepositLimitAmount(300))))

      awaitRight(punters.setDepositLimits(punterId, decreasedLimits))

      // then
      val punterProfile = awaitRight(punters.getPunterProfile(punterId))

      punterProfile.depositLimits.daily.current.limit shouldBe initialDepositLimits.daily
      punterProfile.depositLimits.weekly.current.limit shouldBe initialDepositLimits.weekly
      punterProfile.depositLimits.monthly.current.limit shouldBe initialDepositLimits.monthly

      punterProfile.depositLimits.daily.next.get.limit shouldBe decreasedLimits.daily
      punterProfile.depositLimits.weekly.next.get.limit shouldBe decreasedLimits.weekly
      punterProfile.depositLimits.monthly.next.get.limit shouldBe decreasedLimits.monthly
    }

    "increase deposit limits then decrease to same value as current should skip the change" in {
      // given
      val punterId = generatePunterId()
      val initialDepositLimits = Limits.unsafe(
        Limit.Daily(Some(createDepositLimitAmount(10))),
        Limit.Weekly(Some(createDepositLimitAmount(20))),
        Limit.Monthly(Some(createDepositLimitAmount(30))))
      awaitRight(
        createActivePunterProfile(
          punterId,
          depositLimits = initialDepositLimits,
          stakeLimits = Limits.none,
          sessionLimits = Limits.none,
          referralCode = None,
          isTestAccount = false))
      // and
      val increasedLimits = Limits.unsafe(
        Limit.Daily(Some(createDepositLimitAmount(200))),
        Limit.Weekly(Some(createDepositLimitAmount(300))),
        Limit.Monthly(Some(createDepositLimitAmount(400))))

      awaitRight(punters.setDepositLimits(punterId, increasedLimits))

      // when
      val decreasedLimits = Limits.unsafe(
        Limit.Daily(Some(createDepositLimitAmount(10))),
        Limit.Weekly(Some(createDepositLimitAmount(20))),
        Limit.Monthly(Some(createDepositLimitAmount(30))))

      awaitRight(punters.setDepositLimits(punterId, decreasedLimits))

      // then
      val punterProfile = awaitRight(punters.getPunterProfile(punterId))

      punterProfile.depositLimits.daily.current.limit shouldBe initialDepositLimits.daily
      punterProfile.depositLimits.weekly.current.limit shouldBe initialDepositLimits.weekly
      punterProfile.depositLimits.monthly.current.limit shouldBe initialDepositLimits.monthly

      punterProfile.depositLimits.daily.next.get.limit shouldBe increasedLimits.daily
      punterProfile.depositLimits.weekly.next.get.limit shouldBe increasedLimits.weekly
      punterProfile.depositLimits.monthly.next.get.limit shouldBe increasedLimits.monthly
    }

    "fail on unknown punter" in {
      // given
      val depositLimits = Limits.unsafe(
        Limit.Daily(Some(createDepositLimitAmount(3))),
        Limit.Weekly(Some(createDepositLimitAmount(10))),
        Limit.Monthly(Some(createDepositLimitAmount(30))))

      // when
      val attempt = awaitLeft(punters.setDepositLimits(generatePunterId(), depositLimits))

      // then
      attempt shouldBe a[PunterProfileDoesNotExist]
    }

    "fail if punter in cool off" in {
      // given
      val punterId = generatePunterId()
      awaitRight(createDefaultPunterProfile(punterId))

      // and
      awaitRight(punters.beginCoolOff(punterId, generateCoolOffDuration(), CoolOffCause.SelfInitiated))

      // when
      val depositLimits = Limits.unsafe(
        Limit.Daily(Some(createDepositLimitAmount(3))),
        Limit.Weekly(Some(createDepositLimitAmount(10))),
        Limit.Monthly(Some(createDepositLimitAmount(30))))
      val attempt = awaitLeft(punters.setDepositLimits(punterId, depositLimits))

      // then
      attempt shouldBe a[PunterInCoolOffError]
    }

    "fail if punter is self excluded" in {
      // given
      val punterId = generatePunterId()
      awaitRight(createDefaultPunterProfile(punterId))

      // and
      awaitRight(punters.beginSelfExclusion(punterId, SelfExclusionOrigin.Internal(SelfExclusionDuration.FiveYears)))

      // when
      val depositLimits = Limits.unsafe(
        Limit.Daily(Some(createDepositLimitAmount(3))),
        Limit.Weekly(Some(createDepositLimitAmount(10))),
        Limit.Monthly(Some(createDepositLimitAmount(30))))
      val attempt = awaitLeft(punters.setDepositLimits(punterId, depositLimits))

      // then
      attempt shouldBe a[PunterInSelfExclusionError]
    }

    "fail if punter suspended" in {
      // given
      val punterId = generatePunterId()
      awaitRight(createDefaultPunterProfile(punterId))

      // and
      awaitRight(punters.suspend(punterId, suspensionEntity, suspendedAt = randomOffsetDateTime()))

      // when
      val depositLimits = Limits.unsafe(
        Limit.Daily(Some(createDepositLimitAmount(3))),
        Limit.Weekly(Some(createDepositLimitAmount(10))),
        Limit.Monthly(Some(createDepositLimitAmount(30))))
      val attempt = awaitLeft(punters.setDepositLimits(punterId, depositLimits))

      // then
      attempt shouldBe a[PunterSuspendedError]
    }
  }

  "Setting session limits" should {
    "set session limits" in {
      // given
      val punterId = generatePunterId()
      val oldSessionLimits = Limits.unsafe(
        SessionLimits.Daily.unsafe(SessionDuration(10.hours)),
        SessionLimits.Weekly.unsafe(SessionDuration(5.days)),
        SessionLimits.Monthly.unsafe(SessionDuration(30.days)))
      awaitRight(
        createActivePunterProfile(
          punterId,
          depositLimits = Limits.none,
          stakeLimits = Limits.none,
          sessionLimits = oldSessionLimits,
          referralCode = None,
          isTestAccount = false))

      // when
      val newSessionLimits = Limits.unsafe(
        SessionLimits.Daily.unsafe(SessionDuration(5.hours)),
        SessionLimits.Weekly.unsafe(SessionDuration(3.days)),
        SessionLimits.Monthly.unsafe(SessionDuration(10.days)))
      awaitRight(punters.setSessionLimits(punterId, newSessionLimits))

      // then
      val punterProfile = awaitRight(punters.getPunterProfile(punterId))

      punterProfile.sessionLimits.daily.current.limit shouldBe newSessionLimits.daily
      punterProfile.sessionLimits.weekly.current.limit shouldBe newSessionLimits.weekly
      punterProfile.sessionLimits.monthly.current.limit shouldBe newSessionLimits.monthly
    }

    "fail on unknown punter" in {
      // when
      val attempt = awaitLeft(punters.setSessionLimits(generatePunterId(), Limits.none))

      // then
      attempt shouldBe a[PunterProfileDoesNotExist]
    }

    "fail if punter in cool off" in {
      // given
      val punterId = generatePunterId()
      awaitRight(createDefaultPunterProfile(punterId))

      // and
      awaitRight(punters.beginCoolOff(punterId, generateCoolOffDuration(), CoolOffCause.SelfInitiated))

      // when
      val attempt = awaitLeft(punters.setSessionLimits(punterId, Limits.none))

      // then
      attempt shouldBe a[PunterInCoolOffError]
    }

    "fail if punter is self excluded" in {
      // given
      val punterId = generatePunterId()
      awaitRight(createDefaultPunterProfile(punterId))

      // and
      awaitRight(punters.beginSelfExclusion(punterId, SelfExclusionOrigin.External))

      // when
      val attempt = awaitLeft(punters.setSessionLimits(punterId, Limits.none))

      // then
      attempt shouldBe a[PunterInSelfExclusionError]
    }

    "fail if punter suspended" in {
      // given
      val punterId = generatePunterId()
      awaitRight(createDefaultPunterProfile(punterId))

      // and
      awaitRight(punters.suspend(punterId, suspensionEntity, suspendedAt = randomOffsetDateTime()))

      // when
      val attempt = awaitLeft(punters.setSessionLimits(punterId, Limits.none))

      // then
      attempt shouldBe a[PunterSuspendedError]
    }
  }

  "Setting stake limits" should {

    "apply a stake limit immediately when punter is first created" in {
      // given
      val punterId = generatePunterId()
      val initialStakeLimits = Limits.unsafe(
        Limit.Daily(Some(createStakeLimitAmount(1000))),
        Limit.Weekly(Some(createStakeLimitAmount(2000))),
        Limit.Monthly(Some(createStakeLimitAmount(10000))))
      awaitRight(
        punters.createUnverifiedPunterProfile(
          punterId,
          depositLimits = Limits.none,
          stakeLimits = initialStakeLimits,
          sessionLimits = Limits.none,
          referralCode = None,
          isTestAccount = false))

      // then
      val punterProfile = awaitRight(punters.getPunterProfile(punterId))

      punterProfile.stakeLimits.daily.current.limit shouldBe initialStakeLimits.daily
      punterProfile.stakeLimits.weekly.current.limit shouldBe initialStakeLimits.weekly
      punterProfile.stakeLimits.monthly.current.limit shouldBe initialStakeLimits.monthly
    }

    "decrease stake limits immediately" in {
      // given
      val punterId = generatePunterId()
      val initialStakeLimits = Limits.unsafe(
        Limit.Daily(Some(createStakeLimitAmount(1000))),
        Limit.Weekly(Some(createStakeLimitAmount(2000))),
        Limit.Monthly(Some(createStakeLimitAmount(10000))))
      awaitRight(
        createActivePunterProfile(
          punterId,
          depositLimits = Limits.none,
          stakeLimits = initialStakeLimits,
          sessionLimits = Limits.none,
          referralCode = None,
          isTestAccount = false))

      // when
      val decreasedLimits = Limits.unsafe(
        Limit.Daily(Some(createStakeLimitAmount(1))),
        Limit.Weekly(Some(createStakeLimitAmount(2))),
        Limit.Monthly(Some(createStakeLimitAmount(3))))

      awaitRight(punters.setStakeLimits(punterId, decreasedLimits))

      // then
      val punterProfile = awaitRight(punters.getPunterProfile(punterId))

      punterProfile.stakeLimits.daily.current.limit shouldBe decreasedLimits.daily
      punterProfile.stakeLimits.weekly.current.limit shouldBe decreasedLimits.weekly
      punterProfile.stakeLimits.monthly.current.limit shouldBe decreasedLimits.monthly
    }

    "increase then decrease stake limits should hold only decreased amount and apply immediately" in {
      // given
      val punterId = generatePunterId()
      val initialStakeLimits = Limits.unsafe(
        Limit.Daily(Some(createStakeLimitAmount(10))),
        Limit.Weekly(Some(createStakeLimitAmount(20))),
        Limit.Monthly(Some(createStakeLimitAmount(30))))
      awaitRight(
        createActivePunterProfile(
          punterId,
          depositLimits = Limits.none,
          stakeLimits = initialStakeLimits,
          sessionLimits = Limits.none,
          referralCode = None,
          isTestAccount = false))
      // and
      val increasedLimits = Limits.unsafe(
        Limit.Daily(Some(createStakeLimitAmount(20))),
        Limit.Weekly(Some(createStakeLimitAmount(30))),
        Limit.Monthly(Some(createStakeLimitAmount(40))))

      awaitRight(punters.setStakeLimits(punterId, increasedLimits))

      // when
      val decreasedLimits = Limits.unsafe(
        Limit.Daily(Some(createStakeLimitAmount(1))),
        Limit.Weekly(Some(createStakeLimitAmount(2))),
        Limit.Monthly(Some(createStakeLimitAmount(3))))

      awaitRight(punters.setStakeLimits(punterId, decreasedLimits))

      // then
      val punterProfile = awaitRight(punters.getPunterProfile(punterId))

      punterProfile.stakeLimits.daily.current.limit shouldBe decreasedLimits.daily
      punterProfile.stakeLimits.weekly.current.limit shouldBe decreasedLimits.weekly
      punterProfile.stakeLimits.monthly.current.limit shouldBe decreasedLimits.monthly

      punterProfile.stakeLimits.daily.next shouldBe None
      punterProfile.stakeLimits.weekly.next shouldBe None
      punterProfile.stakeLimits.monthly.next shouldBe None
    }

    "increase then decrease to a higher than current stake limits should increase to last limit in next period" in {
      // given
      val punterId = generatePunterId()
      val initialStakeLimits = Limits.unsafe(
        Limit.Daily(Some(createStakeLimitAmount(10))),
        Limit.Weekly(Some(createStakeLimitAmount(20))),
        Limit.Monthly(Some(createStakeLimitAmount(30))))
      awaitRight(
        createActivePunterProfile(
          punterId,
          depositLimits = Limits.none,
          stakeLimits = initialStakeLimits,
          sessionLimits = Limits.none,
          referralCode = None,
          isTestAccount = false))
      // and
      val increasedLimits = Limits.unsafe(
        Limit.Daily(Some(createStakeLimitAmount(200))),
        Limit.Weekly(Some(createStakeLimitAmount(300))),
        Limit.Monthly(Some(createStakeLimitAmount(400))))

      awaitRight(punters.setStakeLimits(punterId, increasedLimits))

      // when
      val decreasedLimits = Limits.unsafe(
        Limit.Daily(Some(createStakeLimitAmount(100))),
        Limit.Weekly(Some(createStakeLimitAmount(200))),
        Limit.Monthly(Some(createStakeLimitAmount(300))))

      awaitRight(punters.setStakeLimits(punterId, decreasedLimits))

      // then
      val punterProfile = awaitRight(punters.getPunterProfile(punterId))

      punterProfile.stakeLimits.daily.current.limit shouldBe initialStakeLimits.daily
      punterProfile.stakeLimits.weekly.current.limit shouldBe initialStakeLimits.weekly
      punterProfile.stakeLimits.monthly.current.limit shouldBe initialStakeLimits.monthly

      punterProfile.stakeLimits.daily.next.get.limit shouldBe decreasedLimits.daily
      punterProfile.stakeLimits.weekly.next.get.limit shouldBe decreasedLimits.weekly
      punterProfile.stakeLimits.monthly.next.get.limit shouldBe decreasedLimits.monthly
    }

    "not increase a loss limit until next period" in {
      // given
      val punterId = generatePunterId()
      val initialStakeLimits = Limits.unsafe(
        Limit.Daily(Some(createStakeLimitAmount(1000))),
        Limit.Weekly(Some(createStakeLimitAmount(2000))),
        Limit.Monthly(Some(createStakeLimitAmount(10000))))
      awaitRight(
        createActivePunterProfile(
          punterId,
          depositLimits = Limits.none,
          stakeLimits = initialStakeLimits,
          sessionLimits = Limits.none,
          referralCode = None,
          isTestAccount = false))

      // when
      val increasedLimits = Limits.unsafe(
        Limit.Daily(Some(createStakeLimitAmount(3000))),
        Limit.Weekly(Some(createStakeLimitAmount(15000))),
        Limit.Monthly(Some(createStakeLimitAmount(100000))))

      awaitRight(punters.setStakeLimits(punterId, increasedLimits))

      // then
      val punterProfile = awaitRight(punters.getPunterProfile(punterId))

      punterProfile.stakeLimits.daily.current.limit shouldBe initialStakeLimits.daily
      punterProfile.stakeLimits.daily.next.get.limit shouldBe increasedLimits.daily
      punterProfile.stakeLimits.weekly.current.limit shouldBe initialStakeLimits.weekly
      punterProfile.stakeLimits.weekly.next.get.limit shouldBe increasedLimits.weekly
      punterProfile.stakeLimits.monthly.current.limit shouldBe initialStakeLimits.monthly
      punterProfile.stakeLimits.monthly.next.get.limit shouldBe increasedLimits.monthly
    }

    "fail setting stake limits on unknown punter" in {
      // given
      val stakeLimits = Limits.unsafe(
        Limit.Daily(Some(createStakeLimitAmount(1000))),
        Limit.Weekly(Some(createStakeLimitAmount(2000))),
        Limit.Monthly(Some(createStakeLimitAmount(10000))))

      // when
      val attempt = awaitLeft(punters.setStakeLimits(generatePunterId(), stakeLimits))

      // then
      attempt shouldBe a[PunterProfileDoesNotExist]
    }

    "fail setting stake limits if punter in cool off" in {
      // given
      val punterId = generatePunterId()
      awaitRight(createDefaultPunterProfile(punterId))

      // and
      awaitRight(punters.beginCoolOff(punterId, generateCoolOffDuration(), CoolOffCause.SelfInitiated))

      // when
      val stakeLimits = Limits.unsafe(
        Limit.Daily(Some(createStakeLimitAmount(1000))),
        Limit.Weekly(Some(createStakeLimitAmount(2000))),
        Limit.Monthly(Some(createStakeLimitAmount(10000))))
      val attempt = awaitLeft(punters.setStakeLimits(punterId, stakeLimits))

      // then
      attempt shouldBe a[PunterInCoolOffError]
    }

    "fail setting stake limits if punter is self excluded" in {
      // given
      val punterId = generatePunterId()
      awaitRight(createDefaultPunterProfile(punterId))

      // and
      awaitRight(punters.beginSelfExclusion(punterId, SelfExclusionOrigin.External))

      // when
      val stakeLimits = Limits.unsafe(
        Limit.Daily(Some(createStakeLimitAmount(1000))),
        Limit.Weekly(Some(createStakeLimitAmount(2000))),
        Limit.Monthly(Some(createStakeLimitAmount(10000))))
      val attempt = awaitLeft(punters.setStakeLimits(punterId, stakeLimits))

      // then
      attempt shouldBe a[PunterInSelfExclusionError]
    }

    "fail setting stake limits if punter suspended" in {
      // given
      val punterId = generatePunterId()
      awaitRight(createDefaultPunterProfile(punterId))

      // and
      awaitRight(punters.suspend(punterId, suspensionEntity, suspendedAt = randomOffsetDateTime()))

      // when
      val stakeLimits = Limits.unsafe(
        Limit.Daily(Some(createStakeLimitAmount(3))),
        Limit.Weekly(Some(createStakeLimitAmount(10))),
        Limit.Monthly(Some(createStakeLimitAmount(30))))
      val attempt = awaitLeft(punters.setStakeLimits(punterId, stakeLimits))

      // then
      attempt shouldBe a[PunterSuspendedError]
    }
  }

  "Suspending punter profile" should {
    "suspend active punter profile" in {
      // given
      val punterId = generatePunterId()
      awaitRight(createDefaultPunterProfile(punterId))

      // when
      val suspendedAt = randomOffsetDateTime()
      awaitRight(punters.suspend(punterId, suspensionEntity, suspendedAt = suspendedAt))

      // then
      val punterProfile = awaitRight(punters.getPunterProfile(punterId))
      punterProfile.status shouldBe PunterStatus.Suspended(suspensionEntity)
    }

    "suspend unverified punter profile" in {
      // given
      val punterId = generatePunterId()
      awaitRight(createUnverifiedPunterProfile(punterId))

      // when
      val suspendedAt = randomOffsetDateTime()
      awaitRight(punters.suspend(punterId, suspensionEntity, suspendedAt = suspendedAt))

      // then
      val punterProfile = awaitRight(punters.getPunterProfile(punterId))
      punterProfile.status shouldBe PunterStatus.Suspended(suspensionEntity)
    }

    "fail on unknown punter" in {
      // when
      val attempt =
        awaitLeft(punters.suspend(generatePunterId(), suspensionEntity, suspendedAt = randomOffsetDateTime()))

      // then
      attempt shouldBe a[PunterProfileDoesNotExist]
    }

    "fail if punter already suspended" in {
      // given
      val punterId = generatePunterId()
      awaitRight(createDefaultPunterProfile(punterId))

      // and
      awaitRight(punters.suspend(punterId, suspensionEntity, suspendedAt = randomOffsetDateTime()))

      // when
      val attempt = awaitLeft(punters.suspend(punterId, suspensionEntity, suspendedAt = randomOffsetDateTime()))

      // then
      attempt shouldBe a[PunterAlreadySuspendedError]
    }
  }

  "Un-suspending punter profile" should {
    "un-suspend punter" in {
      // given
      val punterId = generatePunterId()
      awaitRight(createDefaultPunterProfile(punterId))

      // and
      awaitRight(punters.suspend(punterId, OperatorSuspend("nasti boi"), suspendedAt = randomOffsetDateTime()))

      // when
      awaitRight(punters.completeUnsuspend(punterId))

      // then
      eventually(eventuallyTimeout, eventuallyInterval) {
        val punterProfile: PunterProfile = awaitRight(punters.getPunterProfile(punterId))
        punterProfile.status shouldBe PunterStatus.Active
      }
    }

    "store the ActivationPath as 'Manual' in the PunterState when user was unverified" in {
      // given
      val punterId = generatePunterId()

      awaitRight(createUnverifiedPunterProfile(punterId))

      // and
      awaitRight(punters.suspend(punterId, OperatorSuspend("nasti boi"), suspendedAt = randomOffsetDateTime()))

      // when
      awaitRight(punters.completeUnsuspend(punterId))

      // then
      val punterProfile: PunterProfile = awaitRight(punters.getPunterProfile(punterId))
      punterProfile.activationPath shouldBe Some(ActivationPath.Manual)
    }

    "maintain the ActivationPath in the PunterState when a suspended verified user gets unsuspended" in {
      // given
      val punterId = generatePunterId()
      val adminId = generateAdminId()

      awaitRight(
        createActivePunterProfile(
          punterId,
          depositLimits = Limits.none,
          stakeLimits = Limits.none,
          sessionLimits = Limits.none,
          referralCode = None,
          isTestAccount = false))

      // and
      awaitRight(punters.suspend(punterId, OperatorSuspend("nasti boi"), suspendedAt = randomOffsetDateTime()))

      // when
      awaitRight(punters.unsuspend(punterId, adminId))

      // then
      val punterProfile: PunterProfile = awaitRight(punters.getPunterProfile(punterId))
      punterProfile.activationPath shouldBe Some(ActivationPath.IDPV)
    }

    "fail on unknown punter" in {
      // when
      val attempt = awaitLeft(punters.unsuspend(generatePunterId(), generateAdminId()))

      // then
      attempt shouldBe a[PunterProfileDoesNotExist]
    }

    "fail on active punter" in {
      // given
      val punterId = generatePunterId()
      awaitRight(createDefaultPunterProfile(punterId))

      // when
      val attempt = awaitLeft(punters.unsuspend(punterId, generateAdminId()))

      // then
      attempt shouldBe a[PunterNotSuspendedError]
    }
  }

  "Starting a session" should {
    "start a time restricted session and reset the login failure counter when the punter is unverified" in {
      // given
      val sessionLimits = Limits.unsafe(
        SessionLimits.Daily.unsafe(SessionDuration(10.minutes)),
        SessionLimits.Weekly.unsafe(SessionDuration(1.day)),
        SessionLimits.Monthly.unsafe(SessionDuration(10.days)))
      val punterId = generatePunterId()
      awaitRight(
        punters.createUnverifiedPunterProfile(
          punterId,
          depositLimits = Limits.none,
          stakeLimits = Limits.none,
          sessionLimits = sessionLimits,
          referralCode = None,
          isTestAccount = false))

      // and
      awaitRight(punters.incrementLoginFailureCounter(punterId))
      awaitRight(punters.incrementLoginFailureCounter(punterId))
      awaitRight(punters.incrementLoginFailureCounter(punterId))

      // when
      val sessionId = generateSessionId()
      val session = awaitRight(punters.startSession(punterId, sessionId, dateInTheFuture, ipAddress = None))

      // then
      session.sessionId shouldBe sessionId
      session.limitation shouldBe a[Limited]

      // and
      awaitRight(punters.incrementLoginFailureCounter(punterId)) shouldBe PasswordResetRequired(true)
    }

    "start a time restricted session and reset the login failure counter when the punter is active" in {
      // given
      val sessionLimits = Limits.unsafe(
        SessionLimits.Daily.unsafe(SessionDuration(10.minutes)),
        SessionLimits.Weekly.unsafe(SessionDuration(1.day)),
        SessionLimits.Monthly.unsafe(SessionDuration(10.days)))
      val punterId = generatePunterId()
      awaitRight(
        createActivePunterProfile(
          punterId,
          depositLimits = Limits.none,
          stakeLimits = Limits.none,
          sessionLimits = sessionLimits,
          referralCode = None,
          isTestAccount = false))

      // and
      awaitRight(punters.incrementLoginFailureCounter(punterId))
      awaitRight(punters.incrementLoginFailureCounter(punterId))
      awaitRight(punters.incrementLoginFailureCounter(punterId))

      // when
      val sessionId = generateSessionId()
      val session = awaitRight(punters.startSession(punterId, sessionId, dateInTheFuture, ipAddress = None))

      // then
      session.sessionId shouldBe sessionId
      session.limitation shouldBe a[Limited]

      // and
      awaitRight(punters.incrementLoginFailureCounter(punterId)) shouldBe PasswordResetRequired(true)
    }

    "start a session and reset the login failure counter when the punter is self excluded" in {
      // given
      val punterId = generatePunterId()
      awaitRight(createDefaultPunterProfile(punterId))

      // and
      awaitRight(punters.incrementLoginFailureCounter(punterId))
      awaitRight(punters.incrementLoginFailureCounter(punterId))
      awaitRight(punters.incrementLoginFailureCounter(punterId))

      // and
      awaitRight(punters.beginSelfExclusion(punterId, SelfExclusionOrigin.Internal(SelfExclusionDuration.OneYear)))

      // when
      val sessionId = generateSessionId()
      val refreshTokenTimeout = dateInTheFuture
      val session = awaitRight(punters.startSession(punterId, sessionId, refreshTokenTimeout, ipAddress = None))

      // then
      session.sessionId shouldBe sessionId
      session.limitation shouldBe Unlimited(refreshTokenTimeout)

      // and
      awaitRight(punters.incrementLoginFailureCounter(punterId)) shouldBe PasswordResetRequired(true)
    }

    "not be possible when user is suspended" in {
      // given
      val punterId = generatePunterId()
      awaitRight(createDefaultPunterProfile(punterId))

      // and
      awaitRight(punters.suspend(punterId, suspensionEntity, suspendedAt = randomOffsetDateTime()))

      // when
      val sessionAttempt =
        awaitLeft(punters.startSession(punterId, generateSessionId(), dateInTheFuture, ipAddress = None))

      // then
      sessionAttempt shouldBe a[PunterSuspendedError]
    }

    "disconnect a session" in {
      // given
      val punterId = generatePunterId()
      awaitRight(createDefaultPunterProfile(punterId))

      // and
      awaitRight(punters.startSession(punterId, generateSessionId(), dateInTheFuture, ipAddress = None))

      // when
      val session = awaitRight(punters.endSession(punterId))
      session shouldBe a[EndedSession]
    }

    "only retain the latest session" in {
      // given
      val punterId = generatePunterId()
      awaitRight(createDefaultPunterProfile(punterId))

      // and
      val sessionId1 = generateSessionId()
      awaitRight(punters.startSession(punterId, sessionId1, dateInTheFuture, ipAddress = None))

      // and
      val sessionId2 = generateSessionId()
      awaitRight(punters.startSession(punterId, sessionId2, dateInTheFuture, ipAddress = None))

      // when
      val session = awaitRight(punters.endSession(punterId))

      session.sessionId shouldBe sessionId2
    }

    "disconnect a session from Backoffice" in {
      // given
      val punterId = generatePunterId()
      awaitRight(createDefaultPunterProfile(punterId))

      // and
      awaitRight(punters.startSession(punterId, generateSessionId(), dateInTheFuture, ipAddress = None))

      // when
      val session = awaitRight(punters.endSession(punterId))
      session shouldBe a[EndedSession]
    }

    "fail disconnecting session from Backoffice when no session is started" in {
      // given
      val punterId = generatePunterId()
      awaitRight(createDefaultPunterProfile(punterId))

      // when
      val session = awaitLeft(punters.endSession(punterId))
      session shouldBe SessionNotFound
    }

    "fail disconnecting session from Backoffice when incorrect punterId passed" in {
      // given
      val punterId = generatePunterId()

      // when
      val session = awaitLeft(punters.endSession(punterId))
      session shouldBe a[PunterProfileDoesNotExist]
    }

    "put punter in a cool-off period when session limits are breached and set before starting the session" in {
      // given
      val punterId = generatePunterId()
      val sessionLimits = Limits.unsafe(
        SessionLimits.Daily.unsafe(SessionDuration(10.millis)),
        SessionLimits.Weekly.unsafe(SessionDuration(10.hours)),
        SessionLimits.Monthly.unsafe(SessionDuration(30.hours)))
      awaitRight(
        createActivePunterProfile(
          punterId,
          depositLimits = Limits.none,
          stakeLimits = Limits.none,
          sessionLimits = sessionLimits,
          referralCode = None,
          isTestAccount = false))

      // when
      awaitRight(punters.startSession(punterId, generateSessionId(), dateInTheFuture, ipAddress = None))

      // then
      eventually(eventuallyTimeout, eventuallyInterval) {
        val punterProfile = awaitRight(punters.getPunterProfile(punterId))
        punterProfile.status shouldBe InCoolOff
      }
    }

    "put punter in a cool-off period when session limits are breached and set for the first time during a session" in {
      // given
      val punterId = generatePunterId()
      val initialLimits: Limits[SessionDuration] = Limits.none
      awaitRight(
        createActivePunterProfile(
          punterId,
          depositLimits = Limits.none,
          stakeLimits = Limits.none,
          sessionLimits = initialLimits,
          referralCode = None,
          isTestAccount = false))

      // and
      awaitRight(punters.startSession(punterId, generateSessionId(), dateInTheFuture, ipAddress = None))

      // when
      val dailyLimitDecreased = initialLimits.copy(daily = SessionLimits.Daily.unsafe(SessionDuration(10.millis)))
      awaitRight(punters.setSessionLimits(punterId, dailyLimitDecreased))

      // then
      eventually(eventuallyTimeout, eventuallyInterval) {
        val punterProfile = awaitRight(punters.getPunterProfile(punterId))
        punterProfile.status shouldBe InCoolOff
      }
    }

    "put punter in a cool-off period when session limits are breached while being updated in the middle of a session" in {
      // given
      val punterId = generatePunterId()
      val initialLimits = Limits.unsafe(
        SessionLimits.Daily.unsafe(SessionDuration(5.hours)),
        SessionLimits.Weekly.unsafe(SessionDuration(10.hours)),
        SessionLimits.Monthly.unsafe(SessionDuration(30.hours)))
      awaitRight(
        createActivePunterProfile(
          punterId,
          depositLimits = Limits.none,
          stakeLimits = Limits.none,
          sessionLimits = initialLimits,
          referralCode = None,
          isTestAccount = false))

      // and
      awaitRight(punters.startSession(punterId, generateSessionId(), dateInTheFuture, ipAddress = None))

      // when
      val dailyLimitDecreased = initialLimits.copy(daily = SessionLimits.Daily.unsafe(SessionDuration(10.millis)))
      awaitRight(punters.setSessionLimits(punterId, dailyLimitDecreased))

      // then
      eventually(eventuallyTimeout, eventuallyInterval) {
        val punterProfile = awaitRight(punters.getPunterProfile(punterId))
        punterProfile.status shouldBe InCoolOff
      }
    }

    "current opened session and closed sessions should be stored in the punter profile" in {
      // given
      val punterId = generatePunterId()
      awaitRight(createDefaultPunterProfile(punterId))

      // and
      val sessionId1 = generateSessionId()
      awaitRight(punters.startSession(punterId, sessionId1, dateInTheFuture, ipAddress = None))
      awaitRight(punters.endSession(punterId))

      // and
      val sessionId2 = generateSessionId()
      awaitRight(punters.startSession(punterId, sessionId2, dateInTheFuture, ipAddress = None))
      awaitRight(punters.endSession(punterId))

      // and
      val sessionId3 = generateSessionId()
      awaitRight(punters.startSession(punterId, sessionId3, dateInTheFuture, ipAddress = None))

      // when
      val punterProfile = awaitRight(punters.getPunterProfile(punterId))

      punterProfile.maybeCurrentSession should matchPattern {
        case Some(domain.StartedSession(`sessionId3`, _, _)) =>
      }

      punterProfile.endedSessions should have size 2
      punterProfile.endedSessions(0).sessionId should be(`sessionId1`)
      punterProfile.endedSessions(1).sessionId should be(`sessionId2`)
    }
  }

  "Incrementing a failed login counter" should {
    "fail if the punter does not exist" in {
      // given
      val nonExistentPunterId = generatePunterId()

      // when
      val failure = awaitLeft(punters.incrementLoginFailureCounter(nonExistentPunterId))
      failure shouldBe a[PunterProfileDoesNotExist]
    }

    "set the 'passwordResetRequired' flag to true after three failed logins in a row" in {
      // given
      val punterId = generatePunterId()
      awaitRight(createDefaultPunterProfile(punterId))

      // When
      awaitRight(punters.incrementLoginFailureCounter(punterId)) shouldBe PasswordResetRequired(false)
      awaitRight(punters.incrementLoginFailureCounter(punterId)) shouldBe PasswordResetRequired(false)
      awaitRight(punters.incrementLoginFailureCounter(punterId)) shouldBe PasswordResetRequired(true)
    }

    "set the 'passwordResetRequired' flag to true after three failed logins in a row, resetting when starting a new session" in {
      // given
      val punterId = generatePunterId()
      awaitRight(createDefaultPunterProfile(punterId))

      // When
      val resultAfterIncrementNumber1 = awaitRight(punters.incrementLoginFailureCounter(punterId))
      val profileAfterIncrementNumber1 = awaitRight(punters.getPunterProfile(punterId))

      val resultAfterIncrementNumber2 = awaitRight(punters.incrementLoginFailureCounter(punterId))
      val profileAfterIncrementNumber2 = awaitRight(punters.getPunterProfile(punterId))

      awaitRight(punters.startSession(punterId, generateSessionId(), dateInTheFuture, ipAddress = None))

      val resultAfterIncrementNumber3 = awaitRight(punters.incrementLoginFailureCounter(punterId))
      val profileAfterIncrementNumber3 = awaitRight(punters.getPunterProfile(punterId))

      val resultAfterIncrementNumber4 = awaitRight(punters.incrementLoginFailureCounter(punterId))
      val profileAfterIncrementNumber4 = awaitRight(punters.getPunterProfile(punterId))

      val resultAfterIncrementNumber5 = awaitRight(punters.incrementLoginFailureCounter(punterId))
      val profileAfterIncrementNumber5 = awaitRight(punters.getPunterProfile(punterId))

      // Then
      profileAfterIncrementNumber1.passwordResetRequired shouldBe false
      resultAfterIncrementNumber1 shouldBe PasswordResetRequired(false)

      profileAfterIncrementNumber2.passwordResetRequired shouldBe false
      resultAfterIncrementNumber2 shouldBe PasswordResetRequired(false)

      profileAfterIncrementNumber3.passwordResetRequired shouldBe false
      resultAfterIncrementNumber3 shouldBe PasswordResetRequired(false)

      profileAfterIncrementNumber4.passwordResetRequired shouldBe false
      resultAfterIncrementNumber4 shouldBe PasswordResetRequired(false)

      profileAfterIncrementNumber5.passwordResetRequired shouldBe true
      resultAfterIncrementNumber5 shouldBe PasswordResetRequired(true)
    }

    "starting a session after three failed logins should still ask for a password reset" in {
      // given
      val punterId = generatePunterId()
      awaitRight(createDefaultPunterProfile(punterId))

      // When
      val resultAfterIncrementNumber1 = awaitRight(punters.incrementLoginFailureCounter(punterId))
      val profileAfterIncrementNumber1 = awaitRight(punters.getPunterProfile(punterId))

      val resultAfterIncrementNumber2 = awaitRight(punters.incrementLoginFailureCounter(punterId))
      val profileAfterIncrementNumber2 = awaitRight(punters.getPunterProfile(punterId))

      val resultAfterIncrementNumber3 = awaitRight(punters.incrementLoginFailureCounter(punterId))
      val profileAfterIncrementNumber3 = awaitRight(punters.getPunterProfile(punterId))

      awaitRight(punters.startSession(punterId, generateSessionId(), dateInTheFuture, ipAddress = None))

      val resultAfterIncrementNumber4 = awaitRight(punters.incrementLoginFailureCounter(punterId))
      val profileAfterIncrementNumber4 = awaitRight(punters.getPunterProfile(punterId))

      // Then
      profileAfterIncrementNumber1.passwordResetRequired shouldBe false
      resultAfterIncrementNumber1 shouldBe PasswordResetRequired(false)

      profileAfterIncrementNumber2.passwordResetRequired shouldBe false
      resultAfterIncrementNumber2 shouldBe PasswordResetRequired(false)

      profileAfterIncrementNumber3.passwordResetRequired shouldBe true
      resultAfterIncrementNumber3 shouldBe PasswordResetRequired(true)

      profileAfterIncrementNumber4.passwordResetRequired shouldBe true
      resultAfterIncrementNumber4 shouldBe PasswordResetRequired(true)
    }
  }

  "Recording a failed MFA attempt" should {
    "fail if the punter does not exist" in {
      // given
      val nonExistentPunterId = generatePunterId()

      // when
      val failure = awaitLeft(punters.recordFailedMFAAttempt(nonExistentPunterId))
      failure shouldBe a[PunterProfileDoesNotExist]
    }

    "set the 'passwordResetRequired' flag to true after three failed attempts in a row" in {
      // given
      val punterId = generatePunterId()
      awaitRight(createDefaultPunterProfile(punterId))

      // When
      awaitRight(punters.recordFailedMFAAttempt(punterId))
      val profileAfterRecordNumber1 = awaitRight(punters.getPunterProfile(punterId))

      awaitRight(punters.recordFailedMFAAttempt(punterId))
      val profileAfterRecordNumber2 = awaitRight(punters.getPunterProfile(punterId))

      awaitRight(punters.recordFailedMFAAttempt(punterId))
      val profileAfterRecordNumber3 = awaitRight(punters.getPunterProfile(punterId))

      // Then
      profileAfterRecordNumber1.passwordResetRequired shouldBe false
      profileAfterRecordNumber2.passwordResetRequired shouldBe false
      profileAfterRecordNumber3.passwordResetRequired shouldBe true
    }

    "starting a session should reset the process" in {
      // given
      val punterId = generatePunterId()
      awaitRight(createDefaultPunterProfile(punterId))

      // When
      val resultAfterRecordNumber1 = awaitRight(punters.recordFailedMFAAttempt(punterId))
      val profileAfterRecordNumber1 = awaitRight(punters.getPunterProfile(punterId))

      val resultAfterRecordNumber2 = awaitRight(punters.recordFailedMFAAttempt(punterId))
      val profileAfterRecordNumber2 = awaitRight(punters.getPunterProfile(punterId))

      awaitRight(punters.startSession(punterId, generateSessionId(), dateInTheFuture, ipAddress = None))

      val resultAfterRecordNumber3 = awaitRight(punters.recordFailedMFAAttempt(punterId))
      val profileAfterRecordNumber3 = awaitRight(punters.getPunterProfile(punterId))

      val resultAfterRecordNumber4 = awaitRight(punters.recordFailedMFAAttempt(punterId))
      val profileAfterRecordNumber4 = awaitRight(punters.getPunterProfile(punterId))

      val resultAfterRecordNumber5 = awaitRight(punters.recordFailedMFAAttempt(punterId))
      val profileAfterRecordNumber5 = awaitRight(punters.getPunterProfile(punterId))

      // Then
      profileAfterRecordNumber1.passwordResetRequired shouldBe false
      resultAfterRecordNumber1 shouldBe PasswordResetRequired(false)

      profileAfterRecordNumber2.passwordResetRequired shouldBe false
      resultAfterRecordNumber2 shouldBe PasswordResetRequired(false)

      profileAfterRecordNumber3.passwordResetRequired shouldBe false
      resultAfterRecordNumber3 shouldBe PasswordResetRequired(false)

      profileAfterRecordNumber4.passwordResetRequired shouldBe false
      resultAfterRecordNumber4 shouldBe PasswordResetRequired(false)

      profileAfterRecordNumber5.passwordResetRequired shouldBe true
      resultAfterRecordNumber5 shouldBe PasswordResetRequired(true)
    }

    "starting a session after three failed mfa records should still ask for a password reset" in {
      // given
      val punterId = generatePunterId()
      awaitRight(createDefaultPunterProfile(punterId))

      // When
      val resultAfterRecordNumber1 = awaitRight(punters.recordFailedMFAAttempt(punterId))
      val profileAfterRecordNumber1 = awaitRight(punters.getPunterProfile(punterId))

      val resultAfterRecordNumber2 = awaitRight(punters.recordFailedMFAAttempt(punterId))
      val profileAfterRecordNumber2 = awaitRight(punters.getPunterProfile(punterId))

      val resultAfterRecordNumber3 = awaitRight(punters.recordFailedMFAAttempt(punterId))
      val profileAfterRecordNumber3 = awaitRight(punters.getPunterProfile(punterId))

      awaitRight(punters.startSession(punterId, generateSessionId(), dateInTheFuture, ipAddress = None))

      val resultAfterRecordNumber4 = awaitRight(punters.recordFailedMFAAttempt(punterId))
      val profileAfterRecordNumber4 = awaitRight(punters.getPunterProfile(punterId))

      // Then
      profileAfterRecordNumber1.passwordResetRequired shouldBe false
      resultAfterRecordNumber1 shouldBe PasswordResetRequired(false)

      profileAfterRecordNumber2.passwordResetRequired shouldBe false
      resultAfterRecordNumber2 shouldBe PasswordResetRequired(false)

      profileAfterRecordNumber3.passwordResetRequired shouldBe true
      resultAfterRecordNumber3 shouldBe PasswordResetRequired(true)

      profileAfterRecordNumber4.passwordResetRequired shouldBe true
      resultAfterRecordNumber4 shouldBe PasswordResetRequired(true)
    }
  }

  "Recording MFA Attempts and Incrementing Login Failures should work independently" in {
    val punterId = generatePunterId()
    awaitRight(createDefaultPunterProfile(punterId))

    awaitRight(punters.incrementLoginFailureCounter(punterId)) shouldBe PasswordResetRequired(false)
    awaitRight(punters.recordFailedMFAAttempt(punterId)) shouldBe PasswordResetRequired(false)

    awaitRight(punters.incrementLoginFailureCounter(punterId)) shouldBe PasswordResetRequired(false)
    awaitRight(punters.recordFailedMFAAttempt(punterId)) shouldBe PasswordResetRequired(false)

    awaitRight(punters.incrementLoginFailureCounter(punterId)) shouldBe PasswordResetRequired(true)
    awaitRight(punters.recordFailedMFAAttempt(punterId)) shouldBe PasswordResetRequired(true)
  }

  "Resetting the login context" should {
    "fail if the punter does not exist" in {
      // given
      val nonExistentPunterId = generatePunterId()

      // when
      val failure = awaitLeft(punters.recordFailedMFAAttempt(nonExistentPunterId))
      failure shouldBe a[PunterProfileDoesNotExist]
    }

    "reset the password reset flag and the login failure counter" in {
      // given an existing punter
      val punterId = generatePunterId()
      awaitRight(createDefaultPunterProfile(punterId))

      (1 until 3).foreach(_ => awaitRight(punters.recordFailedMFAAttempt(punterId)))
      (1 until 3).foreach(_ => awaitRight(punters.incrementLoginFailureCounter(punterId)))

      // which has the password reset flag activated and some login failures
      (1 until 3).foreach(_ => awaitRight(punters.recordFailedMFAAttempt(punterId)))
      (1 until 3).foreach(_ => awaitRight(punters.incrementLoginFailureCounter(punterId)))
      awaitRight(punters.getPunterProfile(punterId)).passwordResetRequired shouldBe true

      // when
      awaitRight(punters.resetLoginContext(punterId))

      // then the punter should have the password reset flag deactivated
      awaitRight(punters.getPunterProfile(punterId)).passwordResetRequired shouldBe false

      // then the login failure counter should start from scratch
      awaitRight(punters.incrementLoginFailureCounter(punterId)) shouldBe PasswordResetRequired(false)

      // then recording a failed MFA attempt should not result in a password reset flag activation
      awaitRight(punters.recordFailedMFAAttempt(punterId)) shouldBe PasswordResetRequired(false)
    }

    "reset punter state" in {
      // given an existing punter
      val punterId = generatePunterId()
      awaitRight(createDefaultPunterProfile(punterId))

      // when
      awaitRight(punters.resetPunterState(punterId))

      // then the punter should have the password reset flag deactivated
      awaitRight(punters.getPunterProfile(punterId)).status shouldBe PunterStatus.Unverified
    }
  }

  "Negative Balance transition" should {
    "set negative balance for punter" in {
      // given
      val punterId = generatePunterId()
      awaitRight(createDefaultPunterProfile(punterId))

      // when
      awaitRight(
        punters.setNegativeBalance(punterId, negativeBalanceSuspensionEntity, operationTime = randomOffsetDateTime()))

      // then
      val punterProfile = awaitRight(punters.getPunterProfile(punterId))
      punterProfile.status shouldBe PunterStatus.Suspended(negativeBalanceSuspensionEntity)
      punterProfile.exclusionStatus shouldBe None
    }
  }

  private def createDefaultPunterProfile(punterId: PunterId): EitherT[Future, String, PunterProfile] =
    createActivePunterProfile(
      punterId,
      depositLimits = Limits.none,
      stakeLimits = Limits.none,
      sessionLimits = Limits.none,
      referralCode = None,
      isTestAccount = false)

  private def createActivePunterProfile(
      id: PunterId,
      depositLimits: Limits[DepositLimitAmount],
      stakeLimits: Limits[StakeLimitAmount],
      sessionLimits: Limits[SessionDuration],
      referralCode: Option[ReferralCode],
      isTestAccount: Boolean)(implicit ec: ExecutionContext): EitherT[Future, String, PunterProfile] =
    for {
      profile <-
        punters
          .createUnverifiedPunterProfile(id, depositLimits, stakeLimits, sessionLimits, referralCode, isTestAccount)
          .leftMap(_.toString)
      _ <- punters.verifyPunter(id, ActivationPath.IDPV).leftMap(_.toString)
    } yield profile

  private def createUnverifiedPunterProfile(
      punterId: PunterId): EitherT[Future, PunterProfileAlreadyExists, PunterProfile] =
    punters.createUnverifiedPunterProfile(
      punterId,
      depositLimits = Limits.none,
      stakeLimits = Limits.none,
      sessionLimits = Limits.none,
      referralCode = None,
      isTestAccount = false)

  private def durationOf(coolOff: CoolOffPeriod): FiniteDuration =
    FiniteDuration(Duration.between(coolOff.startTime, coolOff.endTime).getSeconds, SECONDS)
}
