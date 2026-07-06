package phoenix.boundedcontexts.punter

import java.time.OffsetDateTime
import java.util.concurrent.atomic.AtomicReference

import scala.concurrent.ExecutionContext
import scala.concurrent.Future
import scala.concurrent.duration.DurationInt
import scala.concurrent.duration.FiniteDuration

import cats.data.EitherT
import cats.instances.future._

import phoenix.boundedcontexts.punter.PuntersContextProviderSuccess._
import phoenix.core.Clock
import phoenix.core.EitherTUtils._
import phoenix.core.currency.MoneyAmount
import phoenix.http.core.IpAddress
import phoenix.punters.PunterDataGenerator
import phoenix.punters.PunterDataGenerator.Api.generateCoolOffPeriod
import phoenix.punters.PunterDataGenerator.Api.generatePunterId
import phoenix.punters.PunterEntity.AdminId
import phoenix.punters.PunterEntity.PunterId
import phoenix.punters.PunterProtocol.ReferralCode
import phoenix.punters.PunterState.ActivationPath
import phoenix.punters.PunterState.EndedSession
import phoenix.punters.PunterState.SelfExclusionOrigin
import phoenix.punters.PunterState.StartedSession
import phoenix.punters.PuntersBoundedContext
import phoenix.punters.PuntersBoundedContext.PunterUnverifiedError
import phoenix.punters.PuntersBoundedContext._
import phoenix.punters.domain.SessionLimitation.Unlimited
import phoenix.punters.domain.SuspensionEntity.OperatorSuspend
import phoenix.punters.domain._
import phoenix.punters.support.LimitHelpers

class PuntersContextProviderSuccess(
    punterProfile: PunterProfile = examplePunterProfile,
    unverifiedPunterProfile: PunterProfile = examplePunterProfileWith(PunterStatus.Unverified))(implicit clock: Clock)
    extends PuntersBoundedContext {

  private var currentSessionId = PunterDataGenerator.Api.generateSessionId()
  def dateInTheFuture = clock.currentOffsetDateTime().plusMonths(10)

  override def setNegativeBalance(punterId: PunterId, entity: SuspensionEntity, suspendedAt: OffsetDateTime)(implicit
      ec: ExecutionContext): EitherT[Future, SetNegativeBalanceError, Unit] =
    EitherT.safeRightT(())

  override def unsetNegativeBalance(punterId: PunterId)(implicit
      ec: ExecutionContext): EitherT[Future, UnsetNegativeBalanceError, Unit] =
    EitherT.safeRightT(())

  override def suspend(id: PunterId, entity: SuspensionEntity, suspendedAt: OffsetDateTime)(implicit
      ec: ExecutionContext): EitherT[Future, SuspendPunterError, Unit] =
    EitherT.safeRightT(())

  override def unsuspend(id: PunterId, adminId: AdminId)(implicit
      ec: ExecutionContext): EitherT[Future, UnsuspendPunterError, Unit] =
    EitherT.safeRightT(())

  override def getPunterProfile(id: PunterId)(implicit
      ec: ExecutionContext): EitherT[Future, PunterProfileDoesNotExist, PunterProfile] =
    EitherT.safeRightT(punterProfile)

  override def beginCoolOff(id: PunterId, duration: FiniteDuration, cause: CoolOffCause)(implicit
      ec: ExecutionContext): EitherT[Future, PunterCoolOffError, PunterCoolOffBegan] =
    EitherT.safeRightT(
      PunterCoolOffBegan(
        id,
        CoolOffPeriod(clock.currentOffsetDateTime().minusDays(10), clock.currentOffsetDateTime().plusDays(10))))

  override def beginSelfExclusion(id: PunterId, selfExclusionOrigin: SelfExclusionOrigin)(implicit
      ec: ExecutionContext): EitherT[Future, PunterSelfExclusionError, Unit] =
    EitherT.safeRightT(())

  override def endSelfExclusion(id: PunterId)(implicit
      ec: ExecutionContext): EitherT[Future, PunterSelfExclusionEndError, Unit] =
    EitherT.safeRightT(())

  override def setDepositLimits(id: PunterId, depositLimits: Limits[DepositLimitAmount])(implicit
      ec: ExecutionContext): EitherT[Future, PunterSetDepositLimitError, CurrentAndNextLimits[DepositLimitAmount]] =
    EitherT.safeRightT(LimitHelpers.limitsToAlwaysEffectivePeriodicLimits(depositLimits))

  override def setSessionLimits(id: PunterId, limits: Limits[SessionDuration])(implicit
      ec: ExecutionContext): EitherT[Future, PunterSetSessionLimitsError, CurrentAndNextLimits[SessionDuration]] =
    EitherT.safeRightT(punterProfile.sessionLimits)

  override def setStakeLimits(id: PunterId, stakeLimits: Limits[StakeLimitAmount])(implicit
      ec: ExecutionContext): EitherT[Future, PunterSetStakeLimitsError, CurrentAndNextLimits[StakeLimitAmount]] =
    EitherT.safeRightT(LimitHelpers.limitsToAlwaysEffectivePeriodicLimits(stakeLimits))

  override def endCoolOff(id: PunterId)(implicit ec: ExecutionContext): EitherT[Future, PunterCoolOffEndError, Unit] =
    EitherT.safeRightT(())

  override def startSession(
      id: PunterId,
      sessionId: SessionId,
      refreshTokenTimeout: OffsetDateTime,
      ipAddress: Option[IpAddress])(implicit
      ec: ExecutionContext): EitherT[Future, PunterSuspendedError, StartedSession] =
    EitherT.safeRightT {
      currentSessionId = sessionId
      StartedSession(currentSessionId, clock.currentOffsetDateTime(), Unlimited(refreshTokenTimeout), ipAddress)
    }

  override def keepaliveSession(id: PunterId, refreshTokenTimeout: OffsetDateTime)(implicit
      executionContext: ExecutionContext): EitherT[Future, KeepaliveSessionError, Unit] =
    EitherT.safeRightT(())

  override def endSession(id: PunterId)(implicit
      ec: ExecutionContext): EitherT[Future, EndSessionError, EndedSession] = {
    val timestamp = clock.currentOffsetDateTime()
    EitherT.safeRightT(EndedSession(currentSessionId, timestamp, timestamp, Unlimited(dateInTheFuture)))
  }

  override def incrementLoginFailureCounter(id: PunterId)(implicit
      ec: ExecutionContext): EitherT[Future, PunterProfileDoesNotExist, PasswordResetRequired] =
    EitherT.safeRightT(PasswordResetRequired(false))

  override def recordFailedMFAAttempt(id: PunterId)(implicit
      ec: ExecutionContext): EitherT[Future, PunterProfileDoesNotExist, PasswordResetRequired] =
    EitherT.safeRightT(PasswordResetRequired(false))

  override def resetLoginContext(id: PunterId)(implicit
      ec: ExecutionContext): EitherT[Future, PunterProfileDoesNotExist, Unit] =
    EitherT.safeRightT(())

  override def resetPunterState(id: PunterId)(implicit
      ec: ExecutionContext): EitherT[Future, PunterProfileDoesNotExist, Unit] =
    EitherT.safeRightT(())

  override def createUnverifiedPunterProfile(
      id: PunterId,
      depositLimits: Limits[DepositLimitAmount],
      stakeLimits: Limits[StakeLimitAmount],
      sessionLimits: Limits[SessionDuration],
      referralCode: Option[ReferralCode],
      isTestAccount: Boolean)(implicit
      ec: ExecutionContext): EitherT[Future, PunterProfileAlreadyExists, PunterProfile] =
    EitherT.safeRightT(unverifiedPunterProfile)

  override def verifyPunter(id: PunterId, activationPath: ActivationPath)(implicit
      ec: ExecutionContext): EitherT[Future, PunterUnverifiedError, PunterVerified] =
    EitherT.safeRightT(PunterVerified(id))

  override def unverifyPunter(id: PunterId)(implicit
      ec: ExecutionContext): EitherT[Future, PunterProfileDoesNotExist, PunterUnverified] =
    EitherT.safeRightT(PunterUnverified(id))

  override def completeUnsuspend(id: PunterId)(implicit
      ec: ExecutionContext): EitherT[Future, UnsuspendPunterError, Unit] = EitherT.safeRightT(())
}

object PuntersContextProviderSuccess {
  private val clock: Clock = Clock.utcClock

  val examplePunterProfile: PunterProfile =
    PunterProfile(
      generatePunterId(),
      depositLimits = exampleDepositLimits,
      stakeLimits = exampleStakeLimits,
      sessionLimits = exampleSessionLimits,
      status = PunterStatus.Active,
      exclusionStatus = None,
      isTestAccount = false,
      endedSessions = List.empty,
      maybeCurrentSession = None,
      passwordResetRequired = false,
      verifiedAt = None,
      activationPath = None)

  def examplePunterProfileWith(status: PunterStatus): PunterProfile =
    examplePunterProfile.copy(status = status)

  val exampleSuspendedPunterProfile: PunterProfile =
    PunterProfile(
      generatePunterId(),
      depositLimits = exampleDepositLimits,
      stakeLimits = exampleStakeLimits,
      sessionLimits = exampleSessionLimits,
      status = PunterStatus.Suspended(OperatorSuspend("what did you do now?")),
      exclusionStatus = None,
      isTestAccount = false,
      endedSessions = List.empty,
      maybeCurrentSession = None,
      passwordResetRequired = false,
      verifiedAt = None,
      activationPath = None)

  val exampleDeletedPunterProfile: PunterProfile =
    examplePunterProfile.copy(status = PunterStatus.Deleted)

  val exampleCoolingOffPunterProfile: PunterProfile =
    examplePunterProfile.copy(
      status = PunterStatus.InCoolOff,
      exclusionStatus = Some(CoolOffStatus(generateCoolOffPeriod(), CoolOffCause.SelfInitiated)))

  val exampleSelfExcludedPunterProfile: PunterProfile =
    examplePunterProfile.copy(status = PunterStatus.SelfExcluded)

  val exampleUserProfile: UserProfile =
    PunterDataGenerator.generateUserProfile()

  val exampleSuspendedUserProfile: UserProfile =
    PunterDataGenerator.generateSuspendedUserProfile()

  lazy val exampleSessionLimits: CurrentAndNextLimits[SessionDuration] = {
    val inThePast = clock.currentOffsetDateTime().minusYears(10)
    val inTheFuture = clock.currentOffsetDateTime().plusYears(10)
    CurrentAndNextLimits[SessionDuration](
      daily = CurrentAndNextLimit(
        current = EffectiveLimit(Limit.Daily(Some(SessionDuration(20.hours))), since = inThePast),
        next = Some(EffectiveLimit(Limit.Daily(Some(SessionDuration(10.hours))), since = inTheFuture))),
      weekly = CurrentAndNextLimit(
        current = EffectiveLimit(Limit.Weekly(Some(SessionDuration(5.days))), since = inThePast),
        next = Some(EffectiveLimit(Limit.Weekly(Some(SessionDuration(3.days))), since = inTheFuture))),
      monthly = CurrentAndNextLimit(
        current = EffectiveLimit(Limit.Monthly(Some(SessionDuration(20.days))), since = inThePast),
        next = Some(EffectiveLimit(Limit.Monthly(Some(SessionDuration(10.days))), since = inTheFuture))))
  }

  lazy val exampleDepositLimits: CurrentAndNextLimits[DepositLimitAmount] = {
    val inThePast = clock.currentOffsetDateTime().minusYears(10)
    val inTheFuture = clock.currentOffsetDateTime().plusYears(10)
    CurrentAndNextLimits(
      daily = CurrentAndNextLimit(
        current = EffectiveLimit(Limit.Daily(Some(DepositLimitAmount(MoneyAmount(200)))), since = inThePast),
        next = Some(EffectiveLimit(Limit.Daily(Some(DepositLimitAmount(MoneyAmount(100)))), since = inTheFuture))),
      weekly = CurrentAndNextLimit(
        current = EffectiveLimit(Limit.Weekly(Some(DepositLimitAmount(MoneyAmount(200)))), since = inThePast),
        next = Some(EffectiveLimit(Limit.Weekly(Some(DepositLimitAmount(MoneyAmount(100)))), since = inTheFuture))),
      monthly = CurrentAndNextLimit(
        current = EffectiveLimit(Limit.Monthly(Some(DepositLimitAmount(MoneyAmount(200)))), since = inThePast),
        next = Some(EffectiveLimit(Limit.Monthly(Some(DepositLimitAmount(MoneyAmount(100)))), since = inTheFuture))))
  }

  lazy val exampleStakeLimits: CurrentAndNextLimits[StakeLimitAmount] = {
    val inThePast = clock.currentOffsetDateTime().minusYears(10)
    val inTheFuture = clock.currentOffsetDateTime().plusYears(10)
    CurrentAndNextLimits(
      daily = CurrentAndNextLimit(
        current = EffectiveLimit(Limit.Daily(Some(StakeLimitAmount(MoneyAmount(100)))), since = inThePast),
        next = Some(EffectiveLimit(Limit.Daily(Some(StakeLimitAmount(MoneyAmount(150)))), since = inTheFuture))),
      weekly = CurrentAndNextLimit(
        current = EffectiveLimit(Limit.Weekly(Some(StakeLimitAmount(MoneyAmount(1000)))), since = inThePast),
        next = Some(EffectiveLimit(Limit.Weekly(Some(StakeLimitAmount(MoneyAmount(700)))), since = inTheFuture))),
      monthly = CurrentAndNextLimit(
        current = EffectiveLimit(Limit.Monthly(Some(StakeLimitAmount(MoneyAmount(2000)))), since = inThePast),
        next = Some(EffectiveLimit(Limit.Monthly(Some(StakeLimitAmount(MoneyAmount(1000)))), since = inTheFuture))))
  }
}

class MemorizedTestPuntersContext(
    punterProfile: PunterProfile = examplePunterProfile,
    var selfExclusionStarts: AtomicReference[List[(PunterId, SelfExclusionOrigin)]] = new AtomicReference(List.empty),
    var selfExclusionEnds: AtomicReference[List[PunterId]] = new AtomicReference(List.empty),
    var suspensions: AtomicReference[List[(PunterId, SuspensionEntity, OffsetDateTime)]] = new AtomicReference(
      List.empty),
    var deletions: AtomicReference[List[PunterId]] = new AtomicReference(List.empty),
    var recoveries: AtomicReference[List[PunterId]] = new AtomicReference(List.empty),
    var keepalivedSessions: AtomicReference[List[(PunterId, OffsetDateTime)]] = new AtomicReference(List.empty),
    var startSessions: AtomicReference[List[(PunterId, SessionId, OffsetDateTime)]] = new AtomicReference(List.empty),
    var endSessions: AtomicReference[List[PunterId]] = new AtomicReference(List.empty),
    var coolOffs: AtomicReference[List[(PunterId, FiniteDuration)]] = new AtomicReference(List.empty),
    var loginFailureCounterIncrements: AtomicReference[List[PunterId]] = new AtomicReference(List.empty),
    var loginContextResets: AtomicReference[List[PunterId]] = new AtomicReference(List.empty),
    var punterStateResets: AtomicReference[List[PunterId]] = new AtomicReference(List.empty),
    var unverifiedPunterProfileCreations: AtomicReference[
      List[(PunterId, Limits[DepositLimitAmount], Option[ReferralCode], Boolean)]] = new AtomicReference(List.empty),
    var verifications: AtomicReference[List[(PunterId, ActivationPath)]] = new AtomicReference(List.empty))(implicit
    clock: Clock)
    extends PuntersContextProviderSuccess(punterProfile) {

  override def beginSelfExclusion(id: PunterId, selfExclusionOrigin: SelfExclusionOrigin)(implicit
      ec: ExecutionContext): EitherT[Future, PunterSelfExclusionError, Unit] = {
    selfExclusionStarts.updateAndGet { old => old :+ ((id, selfExclusionOrigin)) }
    super.beginSelfExclusion(id, selfExclusionOrigin)
  }

  override def endSelfExclusion(id: PunterId)(implicit
      ec: ExecutionContext): EitherT[Future, PunterSelfExclusionEndError, Unit] = {
    selfExclusionEnds.updateAndGet { old => old :+ id }
    super.endSelfExclusion(id)
  }

  override def setNegativeBalance(punterId: PunterId, entity: SuspensionEntity, suspendedAt: OffsetDateTime)(implicit
      ec: ExecutionContext): EitherT[Future, PuntersBoundedContext.SetNegativeBalanceError, Unit] = {
    super.setNegativeBalance(punterId, entity, suspendedAt)
  }

  override def unsetNegativeBalance(punterId: PunterId)(implicit
      ec: ExecutionContext): EitherT[Future, UnsetNegativeBalanceError, Unit] = {
    super.unsetNegativeBalance(punterId)
  }

  override def suspend(id: PunterId, entity: SuspensionEntity, suspendedAt: OffsetDateTime)(implicit
      ec: ExecutionContext): EitherT[Future, SuspendPunterError, Unit] = {
    suspensions.updateAndGet { old => old :+ ((id, entity, suspendedAt)) }
    super.suspend(id, entity, suspendedAt)
  }

  override def keepaliveSession(id: PunterId, refreshTokenTimeout: OffsetDateTime)(implicit
      ec: ExecutionContext): EitherT[Future, KeepaliveSessionError, Unit] = {
    keepalivedSessions.updateAndGet { old => old :+ (id, refreshTokenTimeout) }
    super.keepaliveSession(id, refreshTokenTimeout)
  }

  override def startSession(
      id: PunterId,
      sessionId: SessionId,
      refreshTokenTimeout: OffsetDateTime,
      ipAddress: Option[IpAddress])(implicit
      ec: ExecutionContext): EitherT[Future, PunterSuspendedError, StartedSession] = {
    startSessions.updateAndGet { old => old :+ (id, sessionId, refreshTokenTimeout) }
    super.startSession(id, sessionId, refreshTokenTimeout, ipAddress)
  }

  override def endSession(id: PunterId)(implicit
      ec: ExecutionContext): EitherT[Future, EndSessionError, EndedSession] = {
    endSessions.updateAndGet { old => old :+ id }
    super.endSession(id)
  }

  override def beginCoolOff(id: PunterId, duration: FiniteDuration, cause: CoolOffCause)(implicit
      ec: ExecutionContext): EitherT[Future, PunterCoolOffError, PunterCoolOffBegan] = {
    coolOffs.updateAndGet { old => old :+ (id, duration) }
    super.beginCoolOff(id, duration, cause)
  }

  override def incrementLoginFailureCounter(id: PunterId)(implicit
      ec: ExecutionContext): EitherT[Future, PunterProfileDoesNotExist, PasswordResetRequired] = {
    loginFailureCounterIncrements.updateAndGet { old => old :+ id }
    super.incrementLoginFailureCounter(id)
  }

  override def resetLoginContext(id: PunterId)(implicit
      ec: ExecutionContext): EitherT[Future, PunterProfileDoesNotExist, Unit] = {
    loginContextResets.updateAndGet { old => old :+ id }
    super.resetLoginContext(id)
  }

  override def resetPunterState(id: PunterId)(implicit
      ec: ExecutionContext): EitherT[Future, PunterProfileDoesNotExist, Unit] = {
    punterStateResets.updateAndGet { old => old :+ id }
    super.resetPunterState(id)
  }

  override def createUnverifiedPunterProfile(
      id: PunterId,
      depositLimits: Limits[DepositLimitAmount],
      stakeLimits: Limits[StakeLimitAmount],
      sessionLimits: Limits[SessionDuration],
      referralCode: Option[ReferralCode],
      isTestAccount: Boolean)(implicit
      ec: ExecutionContext): EitherT[Future, PunterProfileAlreadyExists, PunterProfile] = {
    unverifiedPunterProfileCreations.updateAndGet { old => old :+ ((id, depositLimits, referralCode, isTestAccount)) }
    super.createUnverifiedPunterProfile(id, depositLimits, stakeLimits, sessionLimits, referralCode, isTestAccount)
  }

  override def verifyPunter(id: PunterId, activationPath: ActivationPath)(implicit
      ec: ExecutionContext): EitherT[Future, PunterUnverifiedError, PunterVerified] = {
    verifications.updateAndGet { old => old :+ ((id, activationPath)) }
    super.verifyPunter(id, activationPath)
  }

  override def unverifyPunter(id: PunterId)(implicit
      ec: ExecutionContext): EitherT[Future, PunterProfileDoesNotExist, PunterUnverified] = {
    super.unverifyPunter(id)
  }
}

class PuntersContextProviderFailure extends PuntersBoundedContext {

  override def createUnverifiedPunterProfile(
      id: PunterId,
      depositLimits: Limits[DepositLimitAmount],
      stakeLimits: Limits[StakeLimitAmount],
      sessionLimits: Limits[SessionDuration],
      referralCode: Option[ReferralCode],
      isTestAccount: Boolean)(implicit
      ec: ExecutionContext): EitherT[Future, PunterProfileAlreadyExists, PunterProfile] =
    EitherT.leftT(PunterProfileAlreadyExists(id))

  override def verifyPunter(id: PunterId, activationPath: ActivationPath)(implicit
      ec: ExecutionContext): EitherT[Future, PunterUnverifiedError, PunterVerified] =
    EitherT.leftT(PunterProfileDoesNotExist(id))

  override def unverifyPunter(id: PunterId)(implicit
      ec: ExecutionContext): EitherT[Future, PunterProfileDoesNotExist, PunterUnverified] =
    EitherT.leftT(PunterProfileDoesNotExist(id))

  override def setNegativeBalance(punterId: PunterId, entity: SuspensionEntity, suspendedAt: OffsetDateTime)(implicit
      ec: ExecutionContext): EitherT[Future, SetNegativeBalanceError, Unit] =
    EitherT.leftT(PunterAlreadyHasNegativeBalanceError(punterId))

  override def unsetNegativeBalance(punterId: PunterId)(implicit
      ec: ExecutionContext): EitherT[Future, UnsetNegativeBalanceError, Unit] =
    EitherT.leftT(PunterProfileDoesNotExist(punterId))

  override def suspend(id: PunterId, entity: SuspensionEntity, suspendedAt: OffsetDateTime)(implicit
      ec: ExecutionContext): EitherT[Future, SuspendPunterError, Unit] =
    EitherT.leftT(PunterAlreadySuspendedError(id))

  override def unsuspend(id: PunterId, adminId: AdminId)(implicit
      ec: ExecutionContext): EitherT[Future, UnsuspendPunterError, Unit] =
    EitherT.leftT(PunterNotSuspendedError(id))

  override def getPunterProfile(id: PunterId)(implicit
      ec: ExecutionContext): EitherT[Future, PunterProfileDoesNotExist, PunterProfile] =
    EitherT.leftT(PunterProfileDoesNotExist(id))

  override def beginCoolOff(id: PunterId, duration: FiniteDuration, cause: CoolOffCause)(implicit
      ec: ExecutionContext): EitherT[Future, PunterCoolOffError, PunterCoolOffBegan] =
    EitherT.leftT(PunterSuspendedError(id))

  override def beginSelfExclusion(id: PunterId, selfExclusionOrigin: SelfExclusionOrigin)(implicit
      ec: ExecutionContext): EitherT[Future, PunterSelfExclusionError, Unit] =
    EitherT.leftT(PunterProfileDoesNotExist(id))

  override def endSelfExclusion(id: PunterId)(implicit
      ec: ExecutionContext): EitherT[Future, PunterSelfExclusionEndError, Unit] =
    EitherT.leftT(PunterProfileDoesNotExist(id))

  override def setDepositLimits(id: PunterId, depositLimits: Limits[DepositLimitAmount])(implicit
      ec: ExecutionContext): EitherT[Future, PunterSetDepositLimitError, CurrentAndNextLimits[DepositLimitAmount]] =
    EitherT.leftT(PunterSuspendedError(id))

  override def setSessionLimits(id: PunterId, limits: Limits[SessionDuration])(implicit
      ec: ExecutionContext): EitherT[Future, PunterSetSessionLimitsError, CurrentAndNextLimits[SessionDuration]] =
    EitherT.leftT(PunterSuspendedError(id))

  override def setStakeLimits(id: PunterId, stakeLimits: Limits[StakeLimitAmount])(implicit
      ec: ExecutionContext): EitherT[Future, PunterSetStakeLimitsError, CurrentAndNextLimits[StakeLimitAmount]] =
    EitherT.leftT(PunterSuspendedError(id))

  override def endCoolOff(id: PunterId)(implicit ec: ExecutionContext): EitherT[Future, PunterCoolOffEndError, Unit] =
    EitherT.leftT(PunterNotInCoolOffError(id))

  override def startSession(
      id: PunterId,
      sessionId: SessionId,
      refreshTokenTimeout: OffsetDateTime,
      ipAddress: Option[IpAddress])(implicit
      ec: ExecutionContext): EitherT[Future, PunterSuspendedError, StartedSession] =
    EitherT.leftT(PunterSuspendedError(id))

  override def keepaliveSession(id: PunterId, refreshTokenTimeout: OffsetDateTime)(implicit
      executionContext: ExecutionContext): EitherT[Future, KeepaliveSessionError, Unit] =
    EitherT.leftT(PunterSuspendedError(id))

  override def endSession(id: PunterId)(implicit
      ec: ExecutionContext): EitherT[Future, EndSessionError, EndedSession] = {
    EitherT.leftT(SessionNotFound)
  }

  override def incrementLoginFailureCounter(id: PunterId)(implicit
      ec: ExecutionContext): EitherT[Future, PunterProfileDoesNotExist, PasswordResetRequired] =
    EitherT.leftT(PunterProfileDoesNotExist(id))

  override def recordFailedMFAAttempt(id: PunterId)(implicit
      ec: ExecutionContext): EitherT[Future, PunterProfileDoesNotExist, PasswordResetRequired] =
    EitherT.leftT(PunterProfileDoesNotExist(id))

  override def resetLoginContext(id: PunterId)(implicit
      ec: ExecutionContext): EitherT[Future, PunterProfileDoesNotExist, Unit] =
    EitherT.leftT(PunterProfileDoesNotExist(id))

  override def resetPunterState(id: PunterId)(implicit
      ec: ExecutionContext): EitherT[Future, PunterProfileDoesNotExist, Unit] =
    EitherT.leftT(PunterProfileDoesNotExist(id))

  override def completeUnsuspend(id: PunterId)(implicit
      ec: ExecutionContext): EitherT[Future, UnsuspendPunterError, Unit] = EitherT.leftT(PunterNotSuspendedError(id))
}
