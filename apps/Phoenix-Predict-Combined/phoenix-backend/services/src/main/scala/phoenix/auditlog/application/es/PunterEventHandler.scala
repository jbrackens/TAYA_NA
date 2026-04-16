package phoenix.auditlog.application.es

import scala.concurrent.ExecutionContext
import scala.concurrent.Future

import akka.Done
import akka.projection.eventsourced.EventEnvelope

import phoenix.auditlog.domain.AuditLogger
import phoenix.projections.ProjectionEventHandler
import phoenix.punters.PunterProtocol.Events._

private[auditlog] class PunterEventHandler(auditLogger: AuditLogger)(implicit ec: ExecutionContext)
    extends ProjectionEventHandler[PunterEvent] {
  override def process(envelope: EventEnvelope[PunterEvent]): Future[Done] =
    PunterEventHandler.handle(auditLogger)(envelope.event).map(_ => Done)
}

private[auditlog] object PunterEventHandler {

  def handle(auditLogger: AuditLogger)(event: PunterEvent): Future[Unit] =
    event match {
      case PunterProfileCreated(punterId, _, _, _, _, _) => auditLogger.recordAccountCreation(punterId)
      case _: PunterSuspended | _: PunterUnsuspended | _: DailySessionLimitChanged | _: WeeklySessionLimitChanged |
          _: MonthlySessionLimitChanged | _: DailyDepositLimitChanged | _: WeeklyDepositLimitChanged |
          _: MonthlyDepositLimitChanged | _: DailyStakeLimitChanged | _: WeeklyStakeLimitChanged |
          _: MonthlyStakeLimitChanged | _: CoolOffExclusionBegan | _: SelfExclusionBegan | _: SelfExclusionEnded |
          _: CoolOffEnded | _: SessionStarted | _: SessionEnded | _: SessionUpdated |
          _: LoginFailureCounterIncremented | _: FailedMFAAttemptCounterIncremented | _: LoginContextGotReset |
          _: PunterVerified | _: PunterUnverified | _: PunterUnsuspendStarted | _: NegativeBalanceAccepted |
          _: NegativeBalanceCancelled | _: PunterStateGotReset =>
        ignore()
    }

  private def ignore(): Future[Unit] =
    Future.successful(())
}
