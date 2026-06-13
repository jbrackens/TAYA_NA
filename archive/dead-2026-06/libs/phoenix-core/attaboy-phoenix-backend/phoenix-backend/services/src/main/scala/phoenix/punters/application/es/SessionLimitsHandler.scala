package phoenix.punters.application.es

import scala.concurrent.ExecutionContext
import scala.concurrent.Future

import akka.Done
import akka.projection.eventsourced.EventEnvelope
import org.slf4j.Logger
import org.slf4j.LoggerFactory

import phoenix.core.ScalaObjectUtils._
import phoenix.projections.ProjectionEventHandler
import phoenix.punters.PunterEntity.PunterId
import phoenix.punters.PunterProtocol.Events.CoolOffEnded
import phoenix.punters.PunterProtocol.Events.CoolOffExclusionBegan
import phoenix.punters.PunterProtocol.Events.DailyDepositLimitChanged
import phoenix.punters.PunterProtocol.Events.DailySessionLimitChanged
import phoenix.punters.PunterProtocol.Events.DailyStakeLimitChanged
import phoenix.punters.PunterProtocol.Events.FailedMFAAttemptCounterIncremented
import phoenix.punters.PunterProtocol.Events.LoginContextGotReset
import phoenix.punters.PunterProtocol.Events.LoginFailureCounterIncremented
import phoenix.punters.PunterProtocol.Events.MonthlyDepositLimitChanged
import phoenix.punters.PunterProtocol.Events.MonthlySessionLimitChanged
import phoenix.punters.PunterProtocol.Events.MonthlyStakeLimitChanged
import phoenix.punters.PunterProtocol.Events.NegativeBalanceAccepted
import phoenix.punters.PunterProtocol.Events.NegativeBalanceCancelled
import phoenix.punters.PunterProtocol.Events.PunterEvent
import phoenix.punters.PunterProtocol.Events.PunterProfileCreated
import phoenix.punters.PunterProtocol.Events.PunterStateGotReset
import phoenix.punters.PunterProtocol.Events.PunterSuspended
import phoenix.punters.PunterProtocol.Events.PunterUnsuspendStarted
import phoenix.punters.PunterProtocol.Events.PunterUnsuspended
import phoenix.punters.PunterProtocol.Events.PunterUnverified
import phoenix.punters.PunterProtocol.Events.PunterVerified
import phoenix.punters.PunterProtocol.Events.SelfExclusionBegan
import phoenix.punters.PunterProtocol.Events.SelfExclusionEnded
import phoenix.punters.PunterProtocol.Events.SessionEnded
import phoenix.punters.PunterProtocol.Events.SessionStarted
import phoenix.punters.PunterProtocol.Events.SessionUpdated
import phoenix.punters.PunterProtocol.Events.WeeklyDepositLimitChanged
import phoenix.punters.PunterProtocol.Events.WeeklySessionLimitChanged
import phoenix.punters.PunterProtocol.Events.WeeklyStakeLimitChanged
import phoenix.punters.PunterState.StartedSession
import phoenix.punters.domain.PunterTimeRestrictedSessionsRepository
import phoenix.punters.domain.SessionLimitation
import phoenix.punters.domain.SessionLimitation.Limited
import phoenix.punters.domain.SessionLimitation.Unlimited
import phoenix.punters.domain.SessionRestrictions
import phoenix.punters.domain.TimeRestrictedSession

private[punters] final class SessionLimitsHandler(sessions: PunterTimeRestrictedSessionsRepository)(implicit
    ec: ExecutionContext)
    extends ProjectionEventHandler[PunterEvent] {

  override def process(envelope: EventEnvelope[PunterEvent]): Future[Done] =
    SessionLimitsHandler.handle(sessions)(envelope.event).map(_ => Done)
}

private[punters] object SessionLimitsHandler {

  private val log: Logger = LoggerFactory.getLogger(getClass)

  def handle(sessions: PunterTimeRestrictedSessionsRepository)(event: PunterEvent): Future[Unit] = {
    event match {
      case SessionStarted(punterId, session, _) =>
        upsertSession(sessions, punterId, session)

      case SessionUpdated(punterId, session) =>
        upsertSession(sessions, punterId, session)

      case SessionEnded(_, session) =>
        sessions.delete(session.sessionId)

      case _: DailySessionLimitChanged | _: WeeklySessionLimitChanged | _: MonthlySessionLimitChanged |
          _: DailyDepositLimitChanged | _: WeeklyDepositLimitChanged | _: MonthlyDepositLimitChanged |
          _: DailyStakeLimitChanged | _: WeeklyStakeLimitChanged | _: MonthlyStakeLimitChanged |
          _: CoolOffExclusionBegan | _: CoolOffEnded | _: PunterSuspended | _: PunterUnsuspended |
          _: SelfExclusionBegan | _: SelfExclusionEnded | _: FailedMFAAttemptCounterIncremented |
          _: LoginContextGotReset | _: LoginFailureCounterIncremented | _: PunterUnsuspendStarted |
          _: PunterProfileCreated | _: PunterVerified | _: NegativeBalanceAccepted | _: NegativeBalanceCancelled |
          _: PunterUnverified | _: PunterStateGotReset =>
        Future.successful(log.debug(s"Ignoring $event, irrelevant for ${SessionLimitsHandler.simpleObjectName}"))
    }
  }

  private def upsertSession(
      sessions: PunterTimeRestrictedSessionsRepository,
      punterId: PunterId,
      session: StartedSession): Future[Unit] = {
    val restrictions = sessionRestrictions(session.limitation)
    sessions.upsert(
      TimeRestrictedSession(
        session.sessionId,
        punterId,
        session.startedAt,
        restrictions,
        session.limitation.refreshTokenTimeout))
  }

  private def sessionRestrictions(limitation: SessionLimitation): Option[SessionRestrictions] =
    limitation match {
      case Unlimited(_) => None
      case Limited(validUntil, coolOffUntil, _) =>
        Some(SessionRestrictions(validUntil, coolOffUntil))
    }
}
