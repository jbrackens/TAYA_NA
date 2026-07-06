package phoenix.punters.application.es

import scala.concurrent.ExecutionContext
import scala.concurrent.Future

import akka.Done
import akka.projection.eventsourced.EventEnvelope
import org.slf4j.Logger
import org.slf4j.LoggerFactory

import phoenix.projections.ProjectionEventHandler
import phoenix.punters.PunterProtocol.Events._
import phoenix.punters.domain.PunterCoolOffEntry
import phoenix.punters.domain.PunterCoolOffsHistoryRepository

final class CoolOffsHistoryHandler(coolOffsHistoryRepository: PunterCoolOffsHistoryRepository)(implicit
    ec: ExecutionContext)
    extends ProjectionEventHandler[PunterEvent] {
  private val log: Logger = LoggerFactory.getLogger(getClass)

  override def process(envelope: EventEnvelope[PunterEvent]): Future[Done] =
    (envelope.event match {
      case CoolOffExclusionBegan(punterId, coolOffPeriod, cause, _) =>
        coolOffsHistoryRepository.insert(
          PunterCoolOffEntry(
            punterId = punterId,
            coolOffStart = coolOffPeriod.startTime,
            coolOffEnd = coolOffPeriod.endTime,
            coolOffCause = cause))
      case _: CoolOffEnded | _: DailyDepositLimitChanged | _: DailySessionLimitChanged | _: DailyStakeLimitChanged |
          _: FailedMFAAttemptCounterIncremented | _: LoginContextGotReset | _: LoginFailureCounterIncremented |
          _: MonthlyDepositLimitChanged | _: MonthlySessionLimitChanged | _: MonthlyStakeLimitChanged |
          _: PunterProfileCreated | _: PunterSuspended | _: PunterUnsuspendStarted | _: PunterUnsuspended |
          _: PunterVerified | _: SelfExclusionBegan | _: SelfExclusionEnded | _: SessionEnded | _: SessionStarted |
          _: SessionUpdated | _: WeeklyDepositLimitChanged | _: WeeklySessionLimitChanged | _: WeeklyStakeLimitChanged |
          _: NegativeBalanceAccepted | _: NegativeBalanceCancelled | _: PunterUnverified | _: PunterStateGotReset =>
        Future.successful(log.debug(s"Ignoring ${envelope.event}, irrelevant for ${getClass().getSimpleName()}"))
    }).map(_ => Done)

}
