package phoenix.punters

import java.time.OffsetDateTime

import scala.collection.immutable.IndexedSeq

import enumeratum.Enum
import enumeratum.EnumEntry
import enumeratum.EnumEntry.UpperSnakecase

import phoenix.core.Clock
import phoenix.http.core.IpAddress
import phoenix.punters.PunterEntity.AdminId
import phoenix.punters.PunterEntity.PunterId
import phoenix.punters.PunterProtocol.ReferralCode
import phoenix.punters.PunterState.PunterProfile.LoginFailureThresholdForForcingPasswordReset
import phoenix.punters.PunterState.PunterProfile.MFAAttemptsThresholdForForcingPasswordReset
import phoenix.punters.PuntersBoundedContext.SessionId
import phoenix.punters.domain.CoolOffCause
import phoenix.punters.domain.CurrentAndNextLimits
import phoenix.punters.domain.DepositLimitAmount
import phoenix.punters.domain.EffectiveLimit
import phoenix.punters.domain.EffectiveLimits
import phoenix.punters.domain.LimitPeriodType.Day
import phoenix.punters.domain.LimitPeriodType.Month
import phoenix.punters.domain.LimitPeriodType.Week
import phoenix.punters.domain.Limits
import phoenix.punters.domain.LimitsLog
import phoenix.punters.domain.PunterSessionStats
import phoenix.punters.domain.PunterSessions
import phoenix.punters.domain.SessionDuration
import phoenix.punters.domain.SessionLimitation
import phoenix.punters.domain.SessionLimitation.Limited
import phoenix.punters.domain.StakeLimitAmount
import phoenix.punters.domain.SuspensionEntity
import phoenix.punters.infrastructure.PuntersAkkaSerializable

object PunterState {

  final case class CoolOffPeriod(startTime: OffsetDateTime, endTime: OffsetDateTime)

  final case class CoolOffInfo(cause: CoolOffCause, period: CoolOffPeriod)

  sealed trait SelfExclusionOrigin
  object SelfExclusionOrigin {
    case object External extends SelfExclusionOrigin
    final case class Internal(duration: SelfExclusionDuration) extends SelfExclusionOrigin
  }

  sealed trait SelfExclusionDuration extends EnumEntry with UpperSnakecase

  object SelfExclusionDuration extends Enum[SelfExclusionDuration] {
    override def values: IndexedSeq[SelfExclusionDuration] = findValues

    final case object OneYear extends SelfExclusionDuration
    final case object FiveYears extends SelfExclusionDuration
  }

  sealed trait ActivationPath extends EnumEntry with UpperSnakecase

  object ActivationPath extends Enum[ActivationPath] {
    override def values: IndexedSeq[ActivationPath] = findValues

    final case object KBA extends ActivationPath
    final case object IDPV extends ActivationPath
    final case object Manual extends ActivationPath
    final case object Unknown extends ActivationPath
  }

  final case class StartedSession(
      sessionId: SessionId,
      startedAt: OffsetDateTime,
      limitation: SessionLimitation,
      ipAddress: Option[IpAddress])
      extends PunterSession {
    def end(endedAt: OffsetDateTime): EndedSession =
      EndedSession(sessionId, startedAt, endedAt, limitation)
  }

  final case class EndedSession(
      sessionId: SessionId,
      startedAt: OffsetDateTime,
      endedAt: OffsetDateTime,
      limitation: SessionLimitation)
      extends PunterSession

  sealed trait PunterSession {
    val sessionId: SessionId
    val startedAt: OffsetDateTime
    val limitation: SessionLimitation

    def isTimeRestricted: Boolean = limitation.isInstanceOf[Limited]
  }

  sealed trait PunterState extends PuntersAkkaSerializable {
    def asPunterProfileUnsafe(): PunterProfile = asInstanceOf[PunterProfile]
  }

  final case object NotExistingPunter extends PunterState

  trait HasSessions[State <: PunterState] {
    def startSession(session: StartedSession): State
    def updateSession(session: StartedSession): State
    def endSession(endedAt: OffsetDateTime): State

    protected def sessions: PunterSessions
    final def getSessionStats(asOf: OffsetDateTime, clock: Clock): PunterSessionStats =
      sessions.sessionStats(asOf, clock)
    final def getCurrentSession: Option[StartedSession] = sessions.getCurrentSession
  }

  sealed trait PunterProfile extends PunterState {
    val data: PunterProfileData
    val sessions: PunterSessions

    def sessionLimits(asOf: OffsetDateTime, clock: Clock): CurrentAndNextLimits[SessionDuration] =
      sessions.limits(asOf, clock)

    def depositLimits(asOf: OffsetDateTime, clock: Clock): CurrentAndNextLimits[DepositLimitAmount] =
      data.depositLimitsLog.periodicLimits(asOf, clock)

    def stakeLimits(asOf: OffsetDateTime, clock: Clock): CurrentAndNextLimits[StakeLimitAmount] =
      data.stakeLimitsLog.periodicLimits(asOf, clock)

    def updateLoginFailureCount(f: LoginFailureCount => LoginFailureCount): PunterProfile

    def updateInvalidMFAAttemptCounter(f: InvalidMFAAttemptCounter => InvalidMFAAttemptCounter): PunterProfile

    def updatePasswordResetRequiredFlag(newValue: Boolean): PunterProfile

    def resetPunterState(): PunterState

    final def incrementLoginFailureCounter(): PunterState = {
      val stateAfterCounterUpdate = updateLoginFailureCount(_.increment())
      if (stateAfterCounterUpdate.data.loginFailureCount.value >= LoginFailureThresholdForForcingPasswordReset) {
        stateAfterCounterUpdate.updatePasswordResetRequiredFlag(true)
      } else {
        stateAfterCounterUpdate
      }
    }

    final def incrementMFAAttemptCounter(): PunterState = {
      val stateAfterCounterUpdate = updateInvalidMFAAttemptCounter(_.increment())
      if (stateAfterCounterUpdate.data.invalidMFAAttemptCounter.value >= MFAAttemptsThresholdForForcingPasswordReset) {
        stateAfterCounterUpdate.updatePasswordResetRequiredFlag(true)
      } else {
        stateAfterCounterUpdate
      }
    }

    final def resetLoginContext(): PunterState =
      updateLoginFailureCount(_ => LoginFailureCount.Initial)
        .updateInvalidMFAAttemptCounter(_ => InvalidMFAAttemptCounter.Initial)
        .updatePasswordResetRequiredFlag(false)
  }

  object PunterProfile {
    private val MFAAttemptsThresholdForForcingPasswordReset = 3
    private val LoginFailureThresholdForForcingPasswordReset = 3
  }

  final case class PunterProfileData(
      punterId: PunterId,
      depositLimitsLog: LimitsLog[DepositLimitAmount],
      stakeLimitsLog: LimitsLog[StakeLimitAmount],
      referralCode: Option[ReferralCode],
      loginFailureCount: LoginFailureCount,
      isTestAccount: Boolean,
      invalidMFAAttemptCounter: InvalidMFAAttemptCounter,
      passwordResetRequired: Boolean,
      verifiedAt: Option[OffsetDateTime],
      activationPath: Option[ActivationPath],
      verifiedBy: Option[AdminId])

  final case class ActivePunter(data: PunterProfileData, sessions: PunterSessions)
      extends PunterProfile
      with HasSessions[ActivePunter] {

    override def startSession(session: StartedSession): ActivePunter =
      copy(sessions = sessions.startSession(session))

    def updateSession(session: StartedSession): ActivePunter =
      copy(sessions = sessions.modifyCurrentSession(session))

    override def endSession(endedAt: OffsetDateTime): ActivePunter =
      copy(sessions = sessions.endCurrentSession(endedAt))

    def estimateLimitsChange(
        limits: Limits[SessionDuration],
        asOf: OffsetDateTime,
        clock: Clock): EffectiveLimits[SessionDuration] =
      sessions.estimateLimitsChange(limits, asOf, clock)

    def recalculateSessionLimitation(
        accordingTo: EffectiveLimits[SessionDuration],
        recalculationTime: OffsetDateTime,
        clock: Clock): Option[StartedSession] =
      sessions.recalculateSessionLimitation(limits = accordingTo, recalculationTime, clock)

    def estimateDepositLimitsChange(
        limits: Limits[DepositLimitAmount],
        asOf: OffsetDateTime,
        clock: Clock): EffectiveLimits[DepositLimitAmount] =
      data.depositLimitsLog.estimateLimitsChange(limits, asOf, clock)

    def estimateStakeLimitsChange(
        limits: Limits[StakeLimitAmount],
        asOf: OffsetDateTime,
        clock: Clock): EffectiveLimits[StakeLimitAmount] =
      data.stakeLimitsLog.estimateLimitsChange(limits, asOf, clock)

    def withDailyDepositLimit(limit: EffectiveLimit[DepositLimitAmount, Day.type]): PunterState =
      copy(data = data.copy(depositLimitsLog = data.depositLimitsLog.withDaily(limit)))

    def withWeeklyDepositLimit(limit: EffectiveLimit[DepositLimitAmount, Week.type]): PunterState =
      copy(data = data.copy(depositLimitsLog = data.depositLimitsLog.withWeekly(limit)))

    def withMonthlyDepositLimit(limit: EffectiveLimit[DepositLimitAmount, Month.type]): PunterState =
      copy(data = data.copy(depositLimitsLog = data.depositLimitsLog.withMonthly(limit)))

    def withDailySessionLimit(limit: EffectiveLimit[SessionDuration, Day.type]): PunterState =
      copy(sessions = sessions.copy(sessions.limitsLog.withDaily(limit)))

    def withWeeklySessionLimit(limit: EffectiveLimit[SessionDuration, Week.type]): PunterState =
      copy(sessions = sessions.copy(sessions.limitsLog.withWeekly(limit)))

    def withMonthlySessionLimit(limit: EffectiveLimit[SessionDuration, Month.type]): PunterState =
      copy(sessions = sessions.copy(sessions.limitsLog.withMonthly(limit)))

    def withDailyStakeLimit(limit: EffectiveLimit[StakeLimitAmount, Day.type]): PunterState =
      copy(data = data.copy(stakeLimitsLog = data.stakeLimitsLog.withDaily(limit)))

    def withWeeklyStakeLimit(limit: EffectiveLimit[StakeLimitAmount, Week.type]): PunterState =
      copy(data = data.copy(stakeLimitsLog = data.stakeLimitsLog.withWeekly(limit)))

    def withMonthlyStakeLimit(limit: EffectiveLimit[StakeLimitAmount, Month.type]): PunterState =
      copy(data = data.copy(stakeLimitsLog = data.stakeLimitsLog.withMonthly(limit)))

    def coolOff(coolOffPeriod: CoolOffPeriod, cause: CoolOffCause): PunterState =
      CoolOffPunter(data = data, sessions = sessions, CoolOffInfo(cause, coolOffPeriod))
    def selfExclude(selfExclusionOrigin: SelfExclusionOrigin): SelfExcludedPunter =
      SelfExcludedPunter(
        data = data,
        sessions = sessions,
        selfExclusionOrigin = selfExclusionOrigin,
        coolOffInfo = None,
        currentSuspension = None)
    def suspend(entity: SuspensionEntity): PunterState =
      SuspendedPunter(data = data, sessions = sessions, currentSuspension = entity, coolOffInfo = None)

    def negativeBalance(reason: String): PunterState =
      NegativeBalance(
        data = data,
        sessions = sessions,
        reason = reason,
        currentSuspension = None,
        coolOffInfo = None,
        selfExclusionOrigin = None)

    def unverified(): PunterState =
      UnverifiedPunter(data = data.copy(verifiedAt = None), sessions = sessions)

    override def resetPunterState(): PunterState = unverified()

    override def updateLoginFailureCount(f: LoginFailureCount => LoginFailureCount): ActivePunter =
      copy(data = data.copy(loginFailureCount = f(data.loginFailureCount)))

    override def updateInvalidMFAAttemptCounter(
        f: InvalidMFAAttemptCounter => InvalidMFAAttemptCounter): PunterProfile =
      copy(data = data.copy(invalidMFAAttemptCounter = f(data.invalidMFAAttemptCounter)))

    override def updatePasswordResetRequiredFlag(newValue: Boolean): PunterProfile =
      copy(data = data.copy(passwordResetRequired = newValue))
  }

  final case class CoolOffPunter(data: PunterProfileData, sessions: PunterSessions, coolOffInfo: CoolOffInfo)
      extends PunterProfile
      with HasSessions[CoolOffPunter] {

    override def startSession(session: StartedSession): CoolOffPunter =
      copy(sessions = sessions.startSession(session))

    def updateSession(session: StartedSession): CoolOffPunter =
      copy(sessions = sessions.modifyCurrentSession(session))

    override def endSession(endedAt: OffsetDateTime): CoolOffPunter =
      copy(sessions = sessions.endCurrentSession(endedAt))

    def negativeBalance(reason: String): PunterState =
      NegativeBalance(
        data = data,
        sessions = sessions,
        reason = reason,
        currentSuspension = None,
        coolOffInfo = Some(coolOffInfo),
        selfExclusionOrigin = None)

    def unverified(): PunterState =
      UnverifiedPunter(data = data.copy(verifiedAt = None), sessions = sessions)

    override def resetPunterState(): PunterState = unverified()

    def suspend(entity: SuspensionEntity): PunterState =
      SuspendedPunter(data = data, sessions = sessions, currentSuspension = entity, coolOffInfo = Some(coolOffInfo))

    def reactivate(): PunterState =
      ActivePunter(data = data, sessions = sessions)

    def selfExclude(selfExclusionOrigin: SelfExclusionOrigin): PunterState =
      SelfExcludedPunter(data, sessions, selfExclusionOrigin, coolOffInfo = Some(coolOffInfo), currentSuspension = None)

    override def updateLoginFailureCount(f: LoginFailureCount => LoginFailureCount): CoolOffPunter =
      copy(data = data.copy(loginFailureCount = f(data.loginFailureCount)))

    override def updateInvalidMFAAttemptCounter(
        f: InvalidMFAAttemptCounter => InvalidMFAAttemptCounter): PunterProfile =
      copy(data = data.copy(invalidMFAAttemptCounter = f(data.invalidMFAAttemptCounter)))

    override def updatePasswordResetRequiredFlag(newValue: Boolean): PunterProfile =
      copy(data = data.copy(passwordResetRequired = newValue))
  }

  final case class SelfExcludedPunter(
      data: PunterProfileData,
      sessions: PunterSessions,
      selfExclusionOrigin: SelfExclusionOrigin,
      coolOffInfo: Option[CoolOffInfo],
      currentSuspension: Option[SuspensionEntity])
      extends PunterProfile
      with HasSessions[SelfExcludedPunter] {

    override def startSession(session: StartedSession): SelfExcludedPunter =
      copy(sessions = sessions.startSession(session))

    def updateSession(session: StartedSession): SelfExcludedPunter =
      copy(sessions = sessions.modifyCurrentSession(session))

    override def endSession(endedAt: OffsetDateTime): SelfExcludedPunter =
      copy(sessions = sessions.endCurrentSession(endedAt))

    def negativeBalance(reason: String): PunterState =
      NegativeBalance(
        data = data,
        sessions = sessions,
        reason = reason,
        currentSuspension = currentSuspension,
        coolOffInfo = coolOffInfo,
        selfExclusionOrigin = Some(selfExclusionOrigin))

    def unverified(): PunterState =
      UnverifiedPunter(data = data.copy(verifiedAt = None), sessions = sessions)

    override def resetPunterState(): PunterState = unverified()

    def unsuspend(): PunterState = {
      copy(currentSuspension = None)
    }

    def verified(verifiedAt: OffsetDateTime, activationPath: ActivationPath): PunterState =
      copy(data = data.copy(
        verifiedAt = data.verifiedAt.orElse(Some(verifiedAt)),
        activationPath = data.activationPath.orElse(Some(activationPath))))

    def endCoolOff(): PunterState =
      copy(coolOffInfo = None)

    def endSelfExclusion(): PunterState = {
      currentSuspension
        .map(SuspendedPunter(data, sessions, _, coolOffInfo))
        .orElse(coolOffInfo.map(CoolOffPunter(data, sessions, _)))
        .getOrElse(ActivePunter(data, sessions))
    }

    def updateVerifiedBy(verifiedBy: Option[AdminId]) = copy(data = data.copy(verifiedBy = verifiedBy))

    override def updateLoginFailureCount(f: LoginFailureCount => LoginFailureCount): SelfExcludedPunter =
      copy(data = data.copy(loginFailureCount = f(data.loginFailureCount)))

    override def updateInvalidMFAAttemptCounter(
        f: InvalidMFAAttemptCounter => InvalidMFAAttemptCounter): PunterProfile =
      copy(data = data.copy(invalidMFAAttemptCounter = f(data.invalidMFAAttemptCounter)))

    override def updatePasswordResetRequiredFlag(newValue: Boolean): PunterProfile =
      copy(data = data.copy(passwordResetRequired = newValue))
  }

  final case class SuspendedPunter(
      data: PunterProfileData,
      sessions: PunterSessions,
      currentSuspension: SuspensionEntity,
      coolOffInfo: Option[CoolOffInfo])
      extends PunterProfile
      with HasSessions[SuspendedPunter] {
    def unsuspend(): PunterState = {
      coolOffInfo.map(CoolOffPunter(data, sessions, _)).getOrElse(ActivePunter(data, sessions))
    }

    def negativeBalance(reason: String): PunterState =
      NegativeBalance(
        data = data,
        sessions = sessions,
        reason = reason,
        currentSuspension = Some(currentSuspension),
        coolOffInfo = coolOffInfo,
        selfExclusionOrigin = None)

    def unverified(): PunterState =
      UnverifiedPunter(data = data.copy(verifiedAt = None), sessions = sessions)

    override def resetPunterState(): PunterState = unverified()

    def endCoolOff(): PunterState =
      copy(coolOffInfo = None)

    def selfExclude(selfExclusionOrigin: SelfExclusionOrigin): SelfExcludedPunter =
      SelfExcludedPunter(data, sessions, selfExclusionOrigin, coolOffInfo, Some(currentSuspension))

    override def updateLoginFailureCount(f: LoginFailureCount => LoginFailureCount): SuspendedPunter =
      copy(data = data.copy(loginFailureCount = f(data.loginFailureCount)))

    override def updateInvalidMFAAttemptCounter(
        f: InvalidMFAAttemptCounter => InvalidMFAAttemptCounter): PunterProfile =
      copy(data = data.copy(invalidMFAAttemptCounter = f(data.invalidMFAAttemptCounter)))

    override def updatePasswordResetRequiredFlag(newValue: Boolean): PunterProfile =
      copy(data = data.copy(passwordResetRequired = newValue))

    override def startSession(session: StartedSession): SuspendedPunter =
      copy(sessions = sessions)

    override def updateSession(session: StartedSession): SuspendedPunter =
      copy(sessions = sessions)

    override def endSession(endedAt: OffsetDateTime): SuspendedPunter =
      copy(sessions = sessions.endCurrentSession(endedAt))

    def verified(verifiedAt: OffsetDateTime, activationPath: ActivationPath): PunterState =
      copy(data = data.copy(
        verifiedAt = data.verifiedAt.orElse(Some(verifiedAt)),
        activationPath = data.activationPath.orElse(Some(activationPath))))

    def updateVerifiedBy(verifiedBy: Option[AdminId]) = copy(data = data.copy(verifiedBy = verifiedBy))
  }

  final case class NegativeBalance(
      data: PunterProfileData,
      sessions: PunterSessions,
      reason: String,
      currentSuspension: Option[SuspensionEntity],
      coolOffInfo: Option[CoolOffInfo],
      selfExclusionOrigin: Option[SelfExclusionOrigin])
      extends PunterProfile
      with HasSessions[NegativeBalance] {
    def reactivate(): PunterState =
      (coolOffInfo, currentSuspension, selfExclusionOrigin) match {
        case (Some(coolOffInfo), _, _)          => CoolOffPunter(data, sessions, coolOffInfo)
        case (None, Some(currentSuspension), _) => SuspendedPunter(data, sessions, currentSuspension, None)
        case (None, None, Some(selfExclusionOrigin)) =>
          SelfExcludedPunter(data, sessions, selfExclusionOrigin, None, None)
        case (None, None, None) => ActivePunter(data, sessions)
      }

    def unverified(): PunterState =
      UnverifiedPunter(data = data.copy(verifiedAt = None), sessions = sessions)

    override def resetPunterState(): PunterState = unverified()

    def endCoolOff(): PunterState =
      copy(coolOffInfo = None)

    def endSelfExclusion(): PunterState =
      copy(selfExclusionOrigin = None)

    def unsuspend(): PunterState =
      copy(currentSuspension = None)

    override def updateLoginFailureCount(f: LoginFailureCount => LoginFailureCount): NegativeBalance =
      copy(data = data.copy(loginFailureCount = f(data.loginFailureCount)))

    override def updateInvalidMFAAttemptCounter(
        f: InvalidMFAAttemptCounter => InvalidMFAAttemptCounter): PunterProfile =
      copy(data = data.copy(invalidMFAAttemptCounter = f(data.invalidMFAAttemptCounter)))

    override def updatePasswordResetRequiredFlag(newValue: Boolean): PunterProfile =
      copy(data = data.copy(passwordResetRequired = newValue))

    override def startSession(session: StartedSession): NegativeBalance =
      copy(sessions = sessions.startSession(session))

    override def updateSession(session: StartedSession): NegativeBalance =
      copy(sessions = sessions.modifyCurrentSession(session))

    override def endSession(endedAt: OffsetDateTime): NegativeBalance =
      copy(sessions = sessions.endCurrentSession(endedAt))
  }

  final case class UnverifiedPunter(data: PunterProfileData, sessions: PunterSessions)
      extends PunterProfile
      with HasSessions[UnverifiedPunter] {

    override def startSession(session: StartedSession): UnverifiedPunter =
      copy(sessions = sessions.startSession(session))

    def updateSession(session: StartedSession): UnverifiedPunter =
      copy(sessions = sessions.modifyCurrentSession(session))

    override def endSession(endedAt: OffsetDateTime): UnverifiedPunter =
      copy(sessions = sessions.endCurrentSession(endedAt))

    override def resetPunterState(): PunterState = this

    def verified(verifiedAt: OffsetDateTime, activationPath: ActivationPath): PunterState =
      ActivePunter(
        data = data.copy(verifiedAt = Some(verifiedAt), activationPath = Some(activationPath)),
        sessions = sessions)

    def suspend(entity: SuspensionEntity): PunterState =
      SuspendedPunter(data = data, sessions = sessions, currentSuspension = entity, coolOffInfo = None)

    override def updateLoginFailureCount(f: LoginFailureCount => LoginFailureCount): UnverifiedPunter =
      copy(data = data.copy(loginFailureCount = f(data.loginFailureCount)))

    override def updateInvalidMFAAttemptCounter(
        f: InvalidMFAAttemptCounter => InvalidMFAAttemptCounter): PunterProfile =
      copy(data = data.copy(invalidMFAAttemptCounter = f(data.invalidMFAAttemptCounter)))

    override def updatePasswordResetRequiredFlag(newValue: Boolean): PunterProfile =
      copy(data = data.copy(passwordResetRequired = newValue))
  }
}
