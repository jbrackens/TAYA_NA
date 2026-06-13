package phoenix.punters.cooloff

import scala.concurrent.ExecutionContext
import scala.concurrent.Future

import akka.Done
import akka.projection.eventsourced.EventEnvelope
import org.slf4j.Logger
import org.slf4j.LoggerFactory

import phoenix.projections.ProjectionEventHandler
import phoenix.punters.PunterProtocol.Events._
import phoenix.punters.PunterState.CoolOffPeriod

private final class PunterCoolOffHandler(repository: PunterCoolOffRepository)(implicit ec: ExecutionContext)
    extends ProjectionEventHandler[PunterEvent] {

  override def process(envelope: EventEnvelope[PunterEvent]): Future[Done] =
    PunterCoolOffHandler.handle(envelope.event, repository).map(_ => Done)
}

private object PunterCoolOffHandler {
  private val log: Logger = LoggerFactory.getLogger(getClass)

  def handle(event: PunterEvent, repository: PunterCoolOffRepository): Future[Unit] =
    event match {
      case CoolOffExclusionBegan(punterId, CoolOffPeriod(start, end), cause, _) =>
        repository.save(PunterCoolOff(punterId, start, end, cause))

      case CoolOffEnded(punterId, _, _) =>
        repository.delete(punterId)

      case PunterSuspended(punterId, _, _) =>
        repository.delete(punterId)

      case _: PunterProfileCreated | _: DailySessionLimitChanged | _: WeeklySessionLimitChanged |
          _: MonthlySessionLimitChanged | _: DailyDepositLimitChanged | _: WeeklyDepositLimitChanged |
          _: MonthlyDepositLimitChanged | _: DailyStakeLimitChanged | _: WeeklyStakeLimitChanged |
          _: MonthlyStakeLimitChanged | _: SelfExclusionBegan | _: SelfExclusionEnded | _: PunterUnsuspended |
          _: SessionStarted | _: SessionEnded | _: SessionEnded | _: SessionUpdated |
          _: LoginFailureCounterIncremented | _: FailedMFAAttemptCounterIncremented | _: LoginContextGotReset |
          _: PunterVerified | _: PunterUnsuspendStarted | _: NegativeBalanceAccepted | _: NegativeBalanceCancelled |
          _: PunterUnverified | _: PunterStateGotReset =>
        Future.successful(log.debug(s"Ignoring $event, irrelevant for PunterCoolOffHandler"))
    }
}
