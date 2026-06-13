package phoenix.punters.application.es

import java.time.OffsetDateTime

import scala.concurrent.ExecutionContext
import scala.concurrent.Future

import akka.Done
import akka.projection.eventsourced.EventEnvelope
import org.slf4j.Logger
import org.slf4j.LoggerFactory

import phoenix.projections.ProjectionEventHandler
import phoenix.punters.PunterEntity.PunterId
import phoenix.punters.PunterProtocol.Events
import phoenix.punters.PunterProtocol.Events._
import phoenix.punters.PunterState.SelfExclusionOrigin
import phoenix.punters.PuntersBoundedContext
import phoenix.punters.PuntersBoundedContext.EndSessionError
import phoenix.punters.PuntersBoundedContext.PunterSuspendedError
import phoenix.punters.PuntersBoundedContext.SessionId
import phoenix.punters.application.LogoutUseCase
import phoenix.punters.domain.AuthenticationRepository
import phoenix.utils.UUIDGenerator
import phoenix.wallets.WalletsBoundedContext
import phoenix.wallets.WalletsBoundedContextProtocol.WalletId

final class PunterStatusEventHandler(
    punters: PuntersBoundedContext,
    wallets: WalletsBoundedContext,
    uuidGenerator: UUIDGenerator,
    authenticationRepository: AuthenticationRepository)(implicit ec: ExecutionContext)
    extends ProjectionEventHandler[PunterEvent] {
  private val logoutUseCase = new LogoutUseCase(authenticationRepository, punters)

  val handle = PunterStatusEventHandler.handle(uuidGenerator, logoutUseCase, punters, wallets) _

  override def process(envelope: EventEnvelope[PunterEvent]): Future[Done] =
    handle(envelope.event).map(_ => Done)
}

private[punters] object PunterStatusEventHandler {
  private val log: Logger = LoggerFactory.getLogger(getClass)

  def handle(
      uuidGenerator: UUIDGenerator,
      logout: LogoutUseCase,
      punters: PuntersBoundedContext,
      wallets: WalletsBoundedContext)(event: PunterEvent)(implicit ec: ExecutionContext): Future[Unit] = {
    event match {
      case PunterUnsuspendStarted(punterId, _) =>
        log.info(s"Checking wallet balance for unsuspend event for punter: $punterId")
        wallets.requestBalanceCheckForUnsuspend(WalletId.deriveFrom(punterId)).value.map(_ => ())

      case PunterSuspended(punterId, _, _) =>
        log.info(s"Terminating session for suspended punter: $punterId")
        logout.logout(punterId).leftSemiflatTap(logEndSessionError(punterId)).value.map(_ => ())

      case SelfExclusionBegan(punterId, SelfExclusionOrigin.Internal(_)) =>
        log.info(s"Terminating session for self-excluded punter: $punterId")
        logout.logout(punterId).leftSemiflatTap(logEndSessionError(punterId)).value.map(_ => ())

      case SelfExclusionBegan(_, SelfExclusionOrigin.External) => Future.unit

      case CoolOffExclusionBegan(punterId, _, _, maybeRefreshTokenTimeout) =>
        restartSession(uuidGenerator, punters)(punterId, maybeRefreshTokenTimeout)

      case CoolOffEnded(punterId, _, maybeRefreshTokenTimeout) =>
        restartSession(uuidGenerator, punters)(punterId, maybeRefreshTokenTimeout)

      case _: Events.DailySessionLimitChanged | _: Events.PunterProfileCreated | _: Events.WeeklySessionLimitChanged |
          _: Events.MonthlySessionLimitChanged | _: Events.DailyDepositLimitChanged |
          _: Events.WeeklyDepositLimitChanged | _: Events.MonthlyDepositLimitChanged |
          _: Events.DailyStakeLimitChanged | _: Events.WeeklyStakeLimitChanged | _: Events.PunterUnsuspended |
          _: Events.SessionStarted | _: Events.SessionEnded | _: Events.SessionUpdated |
          _: Events.LoginFailureCounterIncremented | _: Events.MonthlyStakeLimitChanged |
          _: Events.FailedMFAAttemptCounterIncremented | _: Events.LoginContextGotReset | _: PunterVerified |
          _: SelfExclusionEnded | _: NegativeBalanceAccepted | _: NegativeBalanceCancelled | _: PunterUnverified |
          _: PunterStateGotReset =>
        Future.unit
    }
  }

  def restartSession(uuidGenerator: UUIDGenerator, punters: PuntersBoundedContext)(
      punterId: PunterId,
      maybeRefreshTokenTimeout: Option[OffsetDateTime])(implicit ec: ExecutionContext): Future[Unit] = {
    maybeRefreshTokenTimeout match {
      case Some(refreshTokenTimeout) =>
        log.info(s"Restarting session for punter $punterId due to cool-off status changing")
        punters
          .startSession(punterId, SessionId.fromUUID(uuidGenerator.generate()), refreshTokenTimeout, ipAddress = None)
          .leftSemiflatTap {
            case PunterSuspendedError(_) =>
              Future.successful(log.warn(
                s"Could not restart session at cool-off status change for punter $punterId because punter is suspended"))
          }
          .value
          .map(_ => ())
      case None => Future.unit
    }
  }

  def logEndSessionError(punterId: PunterId)(error: EndSessionError): Future[Unit] = {
    error match {
      case PuntersBoundedContext.PunterProfileDoesNotExist(_) =>
        Future.successful(log.warn(s"Could not end session for punter $punterId because punter profile doesn't exist"))
      case PuntersBoundedContext.SessionNotFound =>
        Future.successful(log.warn(s"Could not end session for punter $punterId because session doesn't exist"))
    }
  }
}
