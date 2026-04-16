package phoenix.punters

import java.time.OffsetDateTime

import scala.concurrent.duration.FiniteDuration

import akka.actor.typed.ActorRef

import phoenix.http.core.IpAddress
import phoenix.punters.PunterEntity.AdminId
import phoenix.punters.PunterEntity.PunterId
import phoenix.punters.PunterState._
import phoenix.punters.PuntersBoundedContext.SessionId
import phoenix.punters.domain.CoolOffCause
import phoenix.punters.domain.CurrentAndNextLimits
import phoenix.punters.domain.DepositLimitAmount
import phoenix.punters.domain.EffectiveLimit
import phoenix.punters.domain.LimitPeriodType.Day
import phoenix.punters.domain.LimitPeriodType.Month
import phoenix.punters.domain.LimitPeriodType.Week
import phoenix.punters.domain.Limits
import phoenix.punters.domain.SessionDuration
import phoenix.punters.domain.StakeLimitAmount
import phoenix.punters.domain.SuspensionEntity
import phoenix.punters.infrastructure.PuntersAkkaSerializable

object PunterProtocol {

  final case class PunterRegistrationRequest(punterId: PunterId, referralCode: Option[ReferralCode])

  final case class ReferralCode(value: String)

  object Commands {
    import phoenix.punters.PunterProtocol.Responses.PunterResponse

    sealed trait PunterCommand extends PuntersAkkaSerializable

    sealed trait BusinessCommand {
      val punterId: PunterId
      val replyTo: ActorRef[PunterResponse]
    }

    sealed trait InfrastructureCommand

    final case class CreatePunterProfile(
        punterId: PunterId,
        depositLimits: Limits[DepositLimitAmount],
        stakeLimits: Limits[StakeLimitAmount],
        sessionLimits: Limits[SessionDuration],
        referralCode: Option[ReferralCode],
        isTestAccount: Boolean,
        replyTo: ActorRef[PunterResponse])
        extends PunterCommand
        with BusinessCommand
    final case class VerifyPunter(punterId: PunterId, activationPath: ActivationPath, replyTo: ActorRef[PunterResponse])
        extends PunterCommand
        with BusinessCommand
    final case class UnverifyPunter(punterId: PunterId, replyTo: ActorRef[PunterResponse])
        extends PunterCommand
        with BusinessCommand
    final case class SetDepositLimits(
        punterId: PunterId,
        depositLimits: Limits[DepositLimitAmount],
        replyTo: ActorRef[PunterResponse])
        extends PunterCommand
        with BusinessCommand
    final case class SetSessionLimits(
        punterId: PunterId,
        sessionLimits: Limits[SessionDuration],
        replyTo: ActorRef[PunterResponse])
        extends PunterCommand
        with BusinessCommand
    final case class SetStakeLimits(
        punterId: PunterId,
        stakeLimits: Limits[StakeLimitAmount],
        replyTo: ActorRef[PunterResponse])
        extends PunterCommand
        with BusinessCommand
    final case class BeginCoolOff(
        punterId: PunterId,
        duration: FiniteDuration,
        cause: CoolOffCause,
        replyTo: ActorRef[PunterResponse])
        extends PunterCommand
        with BusinessCommand
    final case class EndCoolOff(punterId: PunterId, replyTo: ActorRef[PunterResponse])
        extends PunterCommand
        with BusinessCommand
    final case class BeginSelfExclusion(
        punterId: PunterId,
        selfExclusionOrigin: SelfExclusionOrigin,
        replyTo: ActorRef[PunterResponse])
        extends PunterCommand
        with BusinessCommand
    final case class EndSelfExclusion(punterId: PunterId, replyTo: ActorRef[PunterResponse])
        extends PunterCommand
        with BusinessCommand
    final case class Suspend(
        punterId: PunterId,
        entity: SuspensionEntity,
        suspendedAt: OffsetDateTime,
        replyTo: ActorRef[PunterResponse])
        extends PunterCommand
        with BusinessCommand
    final case class Unsuspend(punterId: PunterId, adminId: AdminId, replyTo: ActorRef[PunterResponse])
        extends PunterCommand
        with BusinessCommand
    final case class SetNegativeBalance(
        punterId: PunterId,
        entity: SuspensionEntity,
        operationTime: OffsetDateTime,
        replyTo: ActorRef[PunterResponse])
        extends PunterCommand
        with BusinessCommand
    final case class UnsetNegativeBalance(punterId: PunterId, replyTo: ActorRef[PunterResponse])
        extends PunterCommand
        with BusinessCommand
    final case class CompleteUnsuspend(punterId: PunterId, replyTo: ActorRef[PunterResponse])
        extends PunterCommand
        with BusinessCommand
    final case class GetPunterProfile(punterId: PunterId, replyTo: ActorRef[PunterResponse])
        extends PunterCommand
        with BusinessCommand
    final case class StartSession(
        punterId: PunterId,
        sessionId: SessionId,
        refreshTokenTimeout: OffsetDateTime,
        ipAddress: Option[IpAddress],
        replyTo: ActorRef[PunterResponse])
        extends PunterCommand
        with BusinessCommand
    final case class KeepaliveSession(
        punterId: PunterId,
        refreshTokenTimeout: OffsetDateTime,
        replyTo: ActorRef[PunterResponse])
        extends PunterCommand
        with BusinessCommand
    final case class EndSession(punterId: PunterId, replyTo: ActorRef[PunterResponse])
        extends PunterCommand
        with BusinessCommand
    final case class IncrementLoginFailureCounter(punterId: PunterId, replyTo: ActorRef[PunterResponse])
        extends PunterCommand
        with BusinessCommand
    final case class IncrementFailedMFAAttemptCounter(punterId: PunterId, replyTo: ActorRef[PunterResponse])
        extends PunterCommand
        with BusinessCommand
    final case class ResetLoginContext(punterId: PunterId, replyTo: ActorRef[PunterResponse])
        extends PunterCommand
        with BusinessCommand
    final case class ResetPunterState(punterId: PunterId, replyTo: ActorRef[PunterResponse])
        extends PunterCommand
        with BusinessCommand
    final case class ChangePhoneNumber(punterId: PunterId, replyTo: ActorRef[PunterResponse])
        extends PunterCommand
        with BusinessCommand
    final case object StopPunter extends PunterCommand with InfrastructureCommand
  }

  object Responses {

    sealed trait PunterResponse extends PuntersAkkaSerializable

    sealed trait PunterSuccess extends PunterResponse

    sealed trait PunterFailure extends PunterResponse

    object Success {
      final case class ProfileCreated(punterId: PunterId, profile: PunterProfile) extends PunterSuccess
      final case class Verified(punterId: PunterId) extends PunterSuccess
      final case class Unverified(punterId: PunterId) extends PunterSuccess
      final case class Suspended(punterId: PunterId) extends PunterSuccess
      final case class NegativeBalanceSet(punterId: PunterId) extends PunterSuccess
      final case class NegativeBalanceUnset(punterId: PunterId) extends PunterSuccess
      final case class PunterUnsuspendStarted(punterId: PunterId) extends PunterSuccess
      final case class PunterUnsuspendCompleted(punterId: PunterId) extends PunterSuccess
      final case class DepositLimitsSet(punterId: PunterId, limits: CurrentAndNextLimits[DepositLimitAmount])
          extends PunterSuccess
      final case class SessionLimitsSet(punterId: PunterId, limits: CurrentAndNextLimits[SessionDuration])
          extends PunterSuccess
      final case class StakeLimitsSet(punterId: PunterId, limits: CurrentAndNextLimits[StakeLimitAmount])
          extends PunterSuccess
      final case class CoolOffBegan(punterId: PunterId, coolOffPeriod: CoolOffPeriod) extends PunterSuccess
      final case class CoolOffEnded(punterId: PunterId) extends PunterSuccess
      final case class SelfExclusionBegan(punterId: PunterId) extends PunterSuccess
      final case class SelfExclusionEnded(punterId: PunterId) extends PunterSuccess
      final case class PunterProfileResponse(punterId: PunterId, profile: PunterProfile) extends PunterSuccess
      final case class SessionStartedResponse(punterId: PunterId, session: StartedSession) extends PunterSuccess
      final case object SessionKeepaliveResponse extends PunterSuccess
      final case class SessionEndedResponse(punterId: PunterId, session: EndedSession) extends PunterSuccess
      final case class IncrementLoginFailureCounterResponse(passwordResetRequired: Boolean) extends PunterSuccess
      final case class IncrementFailedMFAAttemptCounterResponse(passwordResetRequired: Boolean) extends PunterSuccess
      final case class LoginContextGotResetResponse(punterId: PunterId) extends PunterSuccess
      final case class PunterStateGotResetResponse(punterId: PunterId) extends PunterSuccess
    }

    object Failure {
      final case class AlreadyExists(punterId: PunterId) extends PunterFailure
      final case class DoesNotExist(punter: PunterId) extends PunterFailure
      final case class Suspended(punterId: PunterId) extends PunterFailure
      final case class AlreadySuspended(punterId: PunterId) extends PunterFailure
      final case class NotSuspended(punterId: PunterId) extends PunterFailure
      final case class NotNegativeBalance(punterId: PunterId) extends PunterFailure
      final case class SelfExcluded(punterId: PunterId) extends PunterFailure
      final case class NotSelfExcluded(punterId: PunterId) extends PunterFailure
      final case class InCoolOff(punterId: PunterId) extends PunterFailure
      final case class NotInCoolOff(punterId: PunterId) extends PunterFailure
      final case class UnhandledCommandResponse(punterId: PunterId) extends PunterFailure
      final case class SessionNotFound(punterId: PunterId) extends PunterFailure
    }
  }

  object Events {
    sealed trait PunterEvent extends PuntersAkkaSerializable {
      def punterId: PunterId
    }

    final case class PunterVerified(
        punterId: PunterId,
        activationPath: ActivationPath,
        verifiedAt: OffsetDateTime,
        verifiedBy: Option[AdminId])
        extends PunterEvent
    final case class PunterUnverified(punterId: PunterId) extends PunterEvent
    final case class PunterProfileCreated(
        punterId: PunterId,
        depositLimits: Limits[DepositLimitAmount],
        stakeLimits: Limits[StakeLimitAmount],
        sessionLimits: Limits[SessionDuration],
        referralCode: Option[ReferralCode],
        isTestAccount: Boolean)
        extends PunterEvent
    final case class DailySessionLimitChanged(punterId: PunterId, limit: EffectiveLimit[SessionDuration, Day.type])
        extends PunterEvent
    final case class WeeklySessionLimitChanged(punterId: PunterId, limit: EffectiveLimit[SessionDuration, Week.type])
        extends PunterEvent
    final case class MonthlySessionLimitChanged(punterId: PunterId, limit: EffectiveLimit[SessionDuration, Month.type])
        extends PunterEvent
    final case class DailyDepositLimitChanged(punterId: PunterId, limit: EffectiveLimit[DepositLimitAmount, Day.type])
        extends PunterEvent
    final case class WeeklyDepositLimitChanged(punterId: PunterId, limit: EffectiveLimit[DepositLimitAmount, Week.type])
        extends PunterEvent
    final case class MonthlyDepositLimitChanged(
        punterId: PunterId,
        limit: EffectiveLimit[DepositLimitAmount, Month.type])
        extends PunterEvent
    final case class DailyStakeLimitChanged(punterId: PunterId, limits: EffectiveLimit[StakeLimitAmount, Day.type])
        extends PunterEvent
    final case class WeeklyStakeLimitChanged(punterId: PunterId, limits: EffectiveLimit[StakeLimitAmount, Week.type])
        extends PunterEvent
    final case class MonthlyStakeLimitChanged(punterId: PunterId, limits: EffectiveLimit[StakeLimitAmount, Month.type])
        extends PunterEvent
    final case class CoolOffExclusionBegan(
        punterId: PunterId,
        coolOffPeriod: CoolOffPeriod,
        cause: CoolOffCause,
        refreshTokenTimeout: Option[OffsetDateTime])
        extends PunterEvent
    final case class CoolOffEnded(punterId: PunterId, cause: CoolOffCause, refreshTokenTimeout: Option[OffsetDateTime])
        extends PunterEvent
    final case class SelfExclusionBegan(punterId: PunterId, selfExclusionOrigin: SelfExclusionOrigin)
        extends PunterEvent
    final case class SelfExclusionEnded(punterId: PunterId) extends PunterEvent
    final case class PunterSuspended(punterId: PunterId, entity: SuspensionEntity, suspendedAt: OffsetDateTime)
        extends PunterEvent
    final case class NegativeBalanceAccepted(punterId: PunterId, reason: String) extends PunterEvent
    final case class NegativeBalanceCancelled(punterId: PunterId) extends PunterEvent
    final case class PunterUnsuspendStarted(punterId: PunterId, verifiedBy: Option[AdminId]) extends PunterEvent
    final case class PunterUnsuspended(punterId: PunterId) extends PunterEvent
    final case class SessionStarted(punterId: PunterId, session: StartedSession, ipAddress: Option[IpAddress])
        extends PunterEvent
    final case class SessionEnded(punterId: PunterId, session: EndedSession) extends PunterEvent
    final case class SessionUpdated(punterId: PunterId, session: StartedSession) extends PunterEvent
    final case class LoginFailureCounterIncremented(punterId: PunterId) extends PunterEvent
    final case class FailedMFAAttemptCounterIncremented(punterId: PunterId) extends PunterEvent
    final case class LoginContextGotReset(punterId: PunterId) extends PunterEvent
    final case class PunterStateGotReset(punterId: PunterId) extends PunterEvent
  }
}

final case class LoginFailureCount(value: Int) {
  def increment(): LoginFailureCount = copy(value = value + 1)
}
object LoginFailureCount {
  val Initial: LoginFailureCount = LoginFailureCount(0)
}

final case class InvalidMFAAttemptCounter(value: Int) {
  def increment(): InvalidMFAAttemptCounter = copy(value = value + 1)
}
object InvalidMFAAttemptCounter {
  val Initial: InvalidMFAAttemptCounter = InvalidMFAAttemptCounter(0)
}
