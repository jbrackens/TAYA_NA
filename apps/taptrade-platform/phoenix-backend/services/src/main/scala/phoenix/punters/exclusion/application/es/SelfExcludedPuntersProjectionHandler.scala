package phoenix.punters.exclusion.application.es

import java.time.Instant
import java.time.OffsetDateTime

import scala.concurrent.ExecutionContext
import scala.concurrent.Future

import akka.Done
import akka.projection.eventsourced.EventEnvelope

import phoenix.core.Clock
import phoenix.projections.ProjectionEventHandler
import phoenix.punters.PunterProtocol.Events
import phoenix.punters.PunterProtocol.Events.NegativeBalanceAccepted
import phoenix.punters.PunterProtocol.Events.NegativeBalanceCancelled
import phoenix.punters.PunterProtocol.Events.PunterEvent
import phoenix.punters.PunterProtocol.Events.PunterUnsuspendStarted
import phoenix.punters.PunterProtocol.Events.PunterVerified
import phoenix.punters.PunterState.SelfExclusionOrigin
import phoenix.punters.exclusion.domain.SelfExcludedPunter
import phoenix.punters.exclusion.domain.SelfExcludedPuntersRepository

private[exclusion] final class SelfExcludedPuntersProjectionHandler(
    excludedPuntersRepository: SelfExcludedPuntersRepository,
    clock: Clock)(implicit ec: ExecutionContext)
    extends ProjectionEventHandler[PunterEvent] {

  private val handle = SelfExcludedPuntersProjectionHandler.handle(excludedPuntersRepository) _

  override def process(envelope: EventEnvelope[PunterEvent]): Future[Done] = {
    val eventCreationTime = OffsetDateTime.ofInstant(Instant.ofEpochMilli(envelope.timestamp), clock.zone)
    handle(envelope.event, eventCreationTime).map(_ => Done)
  }
}

private[exclusion] object SelfExcludedPuntersProjectionHandler {
  def handle(excludedPuntersRepository: SelfExcludedPuntersRepository)(
      event: PunterEvent,
      eventCreationTime: OffsetDateTime): Future[Unit] =
    event match {
      case Events.SelfExclusionBegan(punterId, SelfExclusionOrigin.Internal(selfExclusionDuration)) =>
        excludedPuntersRepository.upsert(
          SelfExcludedPunter(punterId, selfExclusionDuration, excludedAt = eventCreationTime))

      case Events.SelfExclusionBegan(_, SelfExclusionOrigin.External) => Future.unit

      case Events.SelfExclusionEnded(punterId) =>
        excludedPuntersRepository.delete(punterId)

      case _: Events.CoolOffExclusionBegan | _: Events.PunterProfileCreated | _: Events.DailySessionLimitChanged |
          _: Events.WeeklySessionLimitChanged | _: Events.MonthlySessionLimitChanged |
          _: Events.DailyDepositLimitChanged | _: Events.WeeklyDepositLimitChanged |
          _: Events.MonthlyDepositLimitChanged | _: Events.DailyStakeLimitChanged | _: Events.WeeklyStakeLimitChanged |
          _: Events.PunterSuspended | _: Events.PunterUnsuspended | _: Events.SessionStarted | _: Events.SessionEnded |
          _: Events.SessionUpdated | _: Events.LoginFailureCounterIncremented | _: Events.MonthlyStakeLimitChanged |
          _: Events.CoolOffEnded | _: Events.FailedMFAAttemptCounterIncremented | _: Events.LoginContextGotReset |
          _: PunterVerified | _: PunterUnsuspendStarted | _: NegativeBalanceAccepted | _: NegativeBalanceCancelled |
          _: Events.PunterUnverified | _: Events.PunterStateGotReset =>
        Future.unit
    }
}
