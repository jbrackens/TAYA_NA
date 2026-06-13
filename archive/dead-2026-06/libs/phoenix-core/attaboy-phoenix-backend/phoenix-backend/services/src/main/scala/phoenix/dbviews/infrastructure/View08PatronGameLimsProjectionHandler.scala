package phoenix.dbviews.infrastructure

import java.time.Instant
import java.time.OffsetDateTime

import scala.concurrent.ExecutionContext
import scala.concurrent.Future

import akka.Done
import akka.projection.eventsourced.EventEnvelope
import org.slf4j.Logger

import phoenix.core.Clock
import phoenix.dbviews.domain.model.Constants
import phoenix.dbviews.domain.model.LimitPeriod
import phoenix.dbviews.domain.model.LimitType
import phoenix.dbviews.domain.model.PatronGameLims
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

class View08PatronGameLimsProjectionHandler(
    repository: SlickView08PatronsGameLimsRepository,
    clock: Clock,
    log: Logger)(implicit ec: ExecutionContext)
    extends ProjectionEventHandler[PunterEvent] {
  private val nanosInHour = 60 * 60 * 1000000000
  override def process(envelope: EventEnvelope[PunterEvent]): Future[Done] = {
    val eventDateTime = OffsetDateTime.ofInstant(Instant.ofEpochMilli(envelope.timestamp), clock.zone)
    (envelope.event match {
      case DailyDepositLimitChanged(punterId, limit) =>
        log.info(s"Handling limit change event: ${envelope.event}")
        limitChanged(
          punterId,
          limit.since,
          limit.limit.value.map(_.value.amount),
          LimitType.Deposit,
          LimitPeriod.Daily,
          eventDateTime)
      case WeeklyDepositLimitChanged(punterId, limit) =>
        log.info(s"Handling limit change event: ${envelope.event}")
        limitChanged(
          punterId,
          limit.since,
          limit.limit.value.map(_.value.amount),
          LimitType.Deposit,
          LimitPeriod.Weekly,
          eventDateTime)
      case MonthlyDepositLimitChanged(punterId, limit) =>
        log.info(s"Handling limit change event: ${envelope.event}")
        limitChanged(
          punterId,
          limit.since,
          limit.limit.value.map(_.value.amount),
          LimitType.Deposit,
          LimitPeriod.Monthly,
          eventDateTime)
      case DailyStakeLimitChanged(punterId, limit) =>
        log.info(s"Handling limit change event: ${envelope.event}")
        limitChanged(
          punterId,
          limit.since,
          limit.limit.value.map(_.value.amount),
          LimitType.Wager,
          LimitPeriod.Daily,
          eventDateTime)
      case WeeklyStakeLimitChanged(punterId, limit) =>
        log.info(s"Handling limit change event: ${envelope.event}")
        limitChanged(
          punterId,
          limit.since,
          limit.limit.value.map(_.value.amount),
          LimitType.Wager,
          LimitPeriod.Weekly,
          eventDateTime)
      case MonthlyStakeLimitChanged(punterId, limit) =>
        log.info(s"Handling limit change event: ${envelope.event}")
        limitChanged(
          punterId,
          limit.since,
          limit.limit.value.map(_.value.amount),
          LimitType.Wager,
          LimitPeriod.Monthly,
          eventDateTime)
      case DailySessionLimitChanged(punterId, limit) =>
        log.info(s"Handling limit change event: ${envelope.event}")
        limitChanged(
          punterId,
          limit.since,
          limit.limit.value.map(_.nanos / nanosInHour),
          LimitType.Time,
          LimitPeriod.Daily,
          eventDateTime)
      case WeeklySessionLimitChanged(punterId, limit) =>
        log.info(s"Handling limit change event: ${envelope.event}")
        limitChanged(
          punterId,
          limit.since,
          limit.limit.value.map(_.nanos / nanosInHour),
          LimitType.Time,
          LimitPeriod.Weekly,
          eventDateTime)
      case MonthlySessionLimitChanged(punterId, limit) =>
        log.info(s"Handling limit change event: ${envelope.event}")
        limitChanged(
          punterId,
          limit.since,
          limit.limit.value.map(_.nanos / nanosInHour),
          LimitType.Time,
          LimitPeriod.Monthly,
          eventDateTime)
      case CoolOffExclusionBegan(punterId, coolOffPeriod, _, _) =>
        log.info(s"Handling cooloff event: ${envelope.event}")
        repository.upsert(
          PatronGameLims(
            punterId,
            coolOffPeriod.startTime,
            coolOffPeriod.startTime,
            coolOffPeriod.endTime,
            LimitType.CoolOff,
            None,
            None))
      case CoolOffEnded(_, _, _) | FailedMFAAttemptCounterIncremented(_) | LoginContextGotReset(_) |
          LoginFailureCounterIncremented(_) | NegativeBalanceAccepted(_, _) | NegativeBalanceCancelled(_) |
          PunterProfileCreated(_, _, _, _, _, _) | PunterSuspended(_, _, _) | PunterUnsuspendStarted(_, _) |
          PunterUnsuspended(_) | PunterVerified(_, _, _, _) | PunterUnverified(_) | SelfExclusionBegan(_, _) |
          SelfExclusionEnded(_) | SessionEnded(_, _) | SessionStarted(_, _, _) | SessionUpdated(_, _) |
          PunterStateGotReset(_) =>
        Future.successful(())
    }).map(_ => Done)
  }
  private def limitChanged(
      punterId: PunterId,
      since: OffsetDateTime,
      limit: Option[BigDecimal],
      limitType: LimitType,
      limitPeriod: LimitPeriod,
      reportingTime: OffsetDateTime): Future[Unit] =
    repository.upsert(
      PatronGameLims(
        punterId,
        reportingTime,
        since,
        Constants.defaultLimitEndingTime,
        limitType,
        Some(limitPeriod),
        limit))
}
