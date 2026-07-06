package phoenix.punters.application.es

import java.time.Instant
import java.time.OffsetDateTime

import scala.concurrent.ExecutionContext
import scala.concurrent.Future

import akka.Done
import akka.projection.eventsourced.EventEnvelope
import org.slf4j.Logger
import org.slf4j.LoggerFactory

import phoenix.core.Clock
import phoenix.core.ScalaObjectUtils._
import phoenix.projections.ProjectionEventHandler
import phoenix.punters.PunterEntity.PunterId
import phoenix.punters.PunterProtocol.Events.DailyDepositLimitChanged
import phoenix.punters.PunterProtocol.Events.DailySessionLimitChanged
import phoenix.punters.PunterProtocol.Events.DailyStakeLimitChanged
import phoenix.punters.PunterProtocol.Events.MonthlyDepositLimitChanged
import phoenix.punters.PunterProtocol.Events.MonthlySessionLimitChanged
import phoenix.punters.PunterProtocol.Events.MonthlyStakeLimitChanged
import phoenix.punters.PunterProtocol.Events.PunterEvent
import phoenix.punters.PunterProtocol.Events.WeeklyDepositLimitChanged
import phoenix.punters.PunterProtocol.Events.WeeklySessionLimitChanged
import phoenix.punters.PunterProtocol.Events.WeeklyStakeLimitChanged
import phoenix.punters.domain.EffectiveLimit
import phoenix.punters.domain.LimitChange
import phoenix.punters.domain.LimitPeriodType
import phoenix.punters.domain.LimitPeriodType.Day
import phoenix.punters.domain.LimitPeriodType.Month
import phoenix.punters.domain.LimitPeriodType.Week
import phoenix.punters.domain.PunterLimitsHistoryRepository
import phoenix.punters.domain.ResponsibleGamblingLimitType
import phoenix.punters.domain.ResponsibleGamblingLimitType.DepositAmount
import phoenix.punters.domain.ResponsibleGamblingLimitType.SessionTime
import phoenix.punters.domain.ResponsibleGamblingLimitType.StakeAmount
import phoenix.punters.domain.ValueFormatter

private[punters] final class LimitsHistoryHandler(limitsHistory: PunterLimitsHistoryRepository)(implicit
    ec: ExecutionContext,
    clock: Clock)
    extends ProjectionEventHandler[PunterEvent] {
  override def process(envelope: EventEnvelope[PunterEvent]): Future[Done] = {
    val requestedAt = OffsetDateTime.ofInstant(Instant.ofEpochMilli(envelope.timestamp), clock.zone)
    LimitsHistoryHandler.handle(limitsHistory)(envelope.event, requestedAt).map(_ => Done)
  }
}

private[punters] object LimitsHistoryHandler {

  private val log: Logger = LoggerFactory.getLogger(getClass)

  def handle(
      limitsHistory: PunterLimitsHistoryRepository)(event: PunterEvent, requestedAt: OffsetDateTime): Future[Unit] = {
    def writeToHistory[V: ValueFormatter](
        punterId: PunterId,
        limit: EffectiveLimit[V, _],
        periodType: LimitPeriodType,
        limitType: ResponsibleGamblingLimitType): Future[Unit] =
      limitsHistory.insert(
        LimitChange(punterId, limitType, periodType, limit.limit.formatForDisplay, limit.since, requestedAt))

    event match {
      case DailySessionLimitChanged(punterId, limit)   => writeToHistory(punterId, limit, Day, SessionTime)
      case WeeklySessionLimitChanged(punterId, limit)  => writeToHistory(punterId, limit, Week, SessionTime)
      case MonthlySessionLimitChanged(punterId, limit) => writeToHistory(punterId, limit, Month, SessionTime)
      case DailyDepositLimitChanged(punterId, limit)   => writeToHistory(punterId, limit, Day, DepositAmount)
      case WeeklyDepositLimitChanged(punterId, limit)  => writeToHistory(punterId, limit, Week, DepositAmount)
      case MonthlyDepositLimitChanged(punterId, limit) => writeToHistory(punterId, limit, Month, DepositAmount)
      case DailyStakeLimitChanged(punterId, limit)     => writeToHistory(punterId, limit, Day, StakeAmount)
      case WeeklyStakeLimitChanged(punterId, limit)    => writeToHistory(punterId, limit, Week, StakeAmount)
      case MonthlyStakeLimitChanged(punterId, limit)   => writeToHistory(punterId, limit, Month, StakeAmount)

      case other =>
        Future.successful(log.debug(s"Ignoring $other, irrelevant for ${LimitsHistoryHandler.simpleObjectName}"))
    }
  }
}
