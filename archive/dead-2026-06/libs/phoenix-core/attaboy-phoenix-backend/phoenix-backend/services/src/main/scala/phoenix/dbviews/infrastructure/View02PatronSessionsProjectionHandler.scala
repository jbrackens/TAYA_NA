package phoenix.dbviews.infrastructure

import scala.concurrent.ExecutionContext
import scala.concurrent.Future

import akka.Done
import akka.projection.eventsourced.EventEnvelope

import phoenix.dbviews.domain.model.PatronSession
import phoenix.projections.ProjectionEventHandler
import phoenix.punters.PunterProtocol.Events
import phoenix.punters.PunterProtocol.Events.PunterEvent

class View02PatronSessionsProjectionHandler(repository: View02PatronSessionsRepository)(implicit ec: ExecutionContext)
    extends ProjectionEventHandler[PunterEvent] {

  private val handle = View02PatronSessionsProjectionHandler.handle(repository) _

  override def process(envelope: EventEnvelope[PunterEvent]): Future[Done] =
    handle(envelope.event).map(_ => Done)
}

object View02PatronSessionsProjectionHandler {
  def handle(repository: View02PatronSessionsRepository)(event: PunterEvent)(implicit
      ec: ExecutionContext): Future[Unit] =
    event match {
      case event: Events.SessionStarted if event.ipAddress.isDefined => {
        val session = PatronSession(
          event.punterId,
          event.session.sessionId,
          event.session.startedAt,
          logoutTime = None,
          event.ipAddress.get)
        repository.upsert(session)
      }
      case event: Events.SessionEnded =>
        repository.get(event.session.sessionId).flatMap {
          case Some(startedSession) =>
            val session = startedSession.copy(logoutTime = Some(event.session.endedAt))
            repository.upsert(session)
          case None => Future.unit
        }
      case _: Events.SessionUpdated => {
        Future.unit
      }
      case _: Events.SessionStarted | _: Events.PunterProfileCreated | _: Events.PunterVerified |
          _: Events.PunterUnverified | _: Events.SelfExclusionBegan | _: Events.SelfExclusionEnded |
          _: Events.CoolOffExclusionBegan | _: Events.DailySessionLimitChanged | _: Events.WeeklySessionLimitChanged |
          _: Events.MonthlySessionLimitChanged | _: Events.DailyDepositLimitChanged |
          _: Events.WeeklyDepositLimitChanged | _: Events.MonthlyDepositLimitChanged |
          _: Events.DailyStakeLimitChanged | _: Events.WeeklyStakeLimitChanged | _: Events.PunterSuspended |
          _: Events.PunterUnsuspended | _: Events.LoginFailureCounterIncremented | _: Events.MonthlyStakeLimitChanged |
          _: Events.CoolOffEnded | _: Events.FailedMFAAttemptCounterIncremented | _: Events.LoginContextGotReset |
          _: Events.PunterUnsuspendStarted | _: Events.NegativeBalanceAccepted | _: Events.NegativeBalanceCancelled |
          _: Events.PunterStateGotReset =>
        Future.unit
    }
}
