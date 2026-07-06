package phoenix.punters

import java.time.OffsetDateTime
import java.util.UUID

import scala.concurrent.ExecutionContext
import scala.concurrent.Future
import scala.concurrent.duration.FiniteDuration

import cats.data.EitherT

import phoenix.http.core.IpAddress
import phoenix.punters.PunterEntity.AdminId
import phoenix.punters.PunterEntity.PunterId
import phoenix.punters.PunterProtocol.ReferralCode
import phoenix.punters.PunterState.ActivationPath
import phoenix.punters.PunterState.EndedSession
import phoenix.punters.PunterState.SelfExclusionOrigin
import phoenix.punters.PunterState.StartedSession
import phoenix.punters.PuntersBoundedContext._
import phoenix.punters.domain.CoolOffCause
import phoenix.punters.domain.CurrentAndNextLimits
import phoenix.punters.domain.DepositLimitAmount
import phoenix.punters.domain.Limits
import phoenix.punters.domain.PunterProfile
import phoenix.punters.domain.SessionDuration
import phoenix.punters.domain.StakeLimitAmount
import phoenix.punters.domain.SuspensionEntity
import phoenix.sharding.PhoenixId

trait PuntersBoundedContext {

  def createUnverifiedPunterProfile(
      id: PunterId,
      depositLimits: Limits[DepositLimitAmount],
      stakeLimits: Limits[StakeLimitAmount],
      sessionLimits: Limits[SessionDuration],
      referralCode: Option[ReferralCode],
      isTestAccount: Boolean)(implicit
      ec: ExecutionContext): EitherT[Future, PunterProfileAlreadyExists, domain.PunterProfile]

  def verifyPunter(id: PunterId, activationPath: ActivationPath)(implicit
      ec: ExecutionContext): EitherT[Future, PunterUnverifiedError, PunterVerified]

  def unverifyPunter(id: PunterId)(implicit
      ec: ExecutionContext): EitherT[Future, PunterProfileDoesNotExist, PunterUnverified]

  def getPunterProfile(id: PunterId)(implicit
      ec: ExecutionContext): EitherT[Future, PunterProfileDoesNotExist, PunterProfile]

  def beginCoolOff(id: PunterId, duration: FiniteDuration, cause: CoolOffCause)(implicit
      ec: ExecutionContext): EitherT[Future, PunterCoolOffError, PunterCoolOffBegan]

  def endCoolOff(id: PunterId)(implicit ec: ExecutionContext): EitherT[Future, PunterCoolOffEndError, Unit]

  def beginSelfExclusion(id: PunterId, selfExclusionOrigin: SelfExclusionOrigin)(implicit
      ec: ExecutionContext): EitherT[Future, PunterSelfExclusionError, Unit]

  def endSelfExclusion(id: PunterId)(implicit ec: ExecutionContext): EitherT[Future, PunterSelfExclusionEndError, Unit]

  def setDepositLimits(id: PunterId, depositLimits: Limits[DepositLimitAmount])(implicit
      ec: ExecutionContext): EitherT[Future, PunterSetDepositLimitError, CurrentAndNextLimits[DepositLimitAmount]]

  def setSessionLimits(id: PunterId, limits: Limits[SessionDuration])(implicit
      ec: ExecutionContext): EitherT[Future, PunterSetSessionLimitsError, CurrentAndNextLimits[SessionDuration]]

  def setStakeLimits(id: PunterId, stakeLimits: Limits[StakeLimitAmount])(implicit
      ec: ExecutionContext): EitherT[Future, PunterSetStakeLimitsError, CurrentAndNextLimits[StakeLimitAmount]]

  def setNegativeBalance(id: PunterId, reason: SuspensionEntity, operationTime: OffsetDateTime)(implicit
      ec: ExecutionContext): EitherT[Future, SetNegativeBalanceError, Unit]

  def unsetNegativeBalance(id: PunterId)(implicit
      ec: ExecutionContext): EitherT[Future, UnsetNegativeBalanceError, Unit]

  def suspend(id: PunterId, entity: SuspensionEntity, suspendedAt: OffsetDateTime)(implicit
      ec: ExecutionContext): EitherT[Future, SuspendPunterError, Unit]

  def unsuspend(id: PunterId, adminId: AdminId)(implicit
      ec: ExecutionContext): EitherT[Future, UnsuspendPunterError, Unit]

  def completeUnsuspend(id: PunterId)(implicit ec: ExecutionContext): EitherT[Future, UnsuspendPunterError, Unit]

  def startSession(
      id: PunterId,
      sessionId: SessionId,
      refreshTokenTimeout: OffsetDateTime,
      ipAddress: Option[IpAddress])(implicit
      ec: ExecutionContext): EitherT[Future, PunterSuspendedError, StartedSession]

  def keepaliveSession(id: PunterId, refreshTokenTimeout: OffsetDateTime)(implicit
      executionContext: ExecutionContext): EitherT[Future, KeepaliveSessionError, Unit]

  def endSession(id: PunterId)(implicit ec: ExecutionContext): EitherT[Future, EndSessionError, EndedSession]

  def incrementLoginFailureCounter(id: PunterId)(implicit
      ec: ExecutionContext): EitherT[Future, PunterProfileDoesNotExist, PasswordResetRequired]

  def recordFailedMFAAttempt(id: PunterId)(implicit
      ec: ExecutionContext): EitherT[Future, PunterProfileDoesNotExist, PasswordResetRequired]

  def resetLoginContext(id: PunterId)(implicit ec: ExecutionContext): EitherT[Future, PunterProfileDoesNotExist, Unit]

  def resetPunterState(id: PunterId)(implicit ec: ExecutionContext): EitherT[Future, PunterProfileDoesNotExist, Unit]
}

object PuntersBoundedContext {

  // Responses
  final case class PunterCoolOffBegan(punterId: PunterId, coolOffPeriod: domain.CoolOffPeriod)
  final case class PunterSuspended(punterId: PunterId)
  final case class PunterUnsuspended(punterId: PunterId)
  final case class PunterVerified(punterId: PunterId)
  final case class PunterUnverified(punterId: PunterId)

  final case class PasswordResetRequired(value: Boolean)

  // Errors
  sealed trait PunterCanBetError
  sealed trait PunterCoolOffError
  sealed trait PunterCoolOffEndError
  sealed trait PunterSelfExclusionError
  sealed trait PunterSelfExclusionEndError
  sealed trait PunterSetDepositLimitError
  sealed trait PunterSetSessionLimitsError
  sealed trait PunterSetStakeLimitsError
  sealed trait SuspendPunterError
  sealed trait UnsuspendPunterError
  sealed trait SetNegativeBalanceError
  sealed trait UnsetNegativeBalanceError
  sealed trait KeepaliveSessionError
  sealed trait EndSessionError
  sealed trait PunterLoginError
  sealed trait PunterUnverifiedError

  final case class PunterProfileAlreadyExists(punterId: PunterId)

  final case class PunterProfileDoesNotExist(punterId: PunterId)
      extends PunterCoolOffError
      with PunterSelfExclusionError
      with PunterCoolOffEndError
      with PunterSelfExclusionEndError
      with PunterSetDepositLimitError
      with PunterSetSessionLimitsError
      with PunterSetStakeLimitsError
      with SuspendPunterError
      with UnsuspendPunterError
      with SetNegativeBalanceError
      with UnsetNegativeBalanceError
      with PunterCanBetError
      with EndSessionError
      with PunterLoginError
      with PunterUnverifiedError
      with KeepaliveSessionError

  final case class PunterSuspendedError(punterId: PunterId)
      extends PunterCanBetError
      with PunterCoolOffError
      with PunterCoolOffEndError
      with PunterSelfExclusionEndError
      with PunterSetDepositLimitError
      with PunterSetSessionLimitsError
      with PunterSetStakeLimitsError
      with PunterLoginError
      with KeepaliveSessionError

  final case class PunterInCoolOffError(punterId: PunterId)
      extends PunterCoolOffError
      with PunterSetDepositLimitError
      with PunterSetSessionLimitsError
      with PunterSetStakeLimitsError

  final case class PunterInSelfExclusionError(punterId: PunterId)
      extends PunterSetDepositLimitError
      with PunterSetSessionLimitsError
      with PunterSetStakeLimitsError
      with PunterSelfExclusionError
      with PunterCoolOffError
      with PunterCoolOffEndError
      with SuspendPunterError

  final case class PunterNotInCoolOffError(punterId: PunterId) extends PunterCoolOffEndError

  final case class PunterNotInSelfExclusionError(punterId: PunterId) extends PunterSelfExclusionEndError

  final case class PunterAlreadySuspendedError(punterId: PunterId) extends SuspendPunterError

  final case class PunterNotSuspendedError(punterId: PunterId) extends UnsuspendPunterError

  final case class PunterAlreadyHasNegativeBalanceError(punterId: PunterId) extends SetNegativeBalanceError

  final case object SessionNotFound extends EndSessionError with PunterLoginError

  final case class UnexpectedPunterErrorException(exception: Throwable) extends RuntimeException(exception.getMessage)

  final case class SessionId(value: String) extends PhoenixId

  object SessionId {
    def fromUUID(uuid: UUID): SessionId = SessionId(uuid.toString)
  }

  final case class PunterNotUnverifiedError(punterId: PunterId) extends PunterUnverifiedError
}
