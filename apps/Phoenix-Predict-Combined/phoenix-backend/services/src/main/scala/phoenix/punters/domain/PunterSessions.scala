package phoenix.punters.domain

import java.time.OffsetDateTime

import scala.math.Ordered.orderingToOrdered
import scala.util.Try

import phoenix.core.Clock
import phoenix.punters.PunterState
import phoenix.punters.domain.SessionDuration._

final case class PunterSessions(limitsLog: LimitsLog[SessionDuration], private val sessionsLog: PunterSessionsLog) {

  def changeLimits(limits: EffectiveLimits[SessionDuration]): PunterSessions =
    copy(limitsLog = limitsLog.withDaily(limits.daily).withWeekly(limits.weekly).withMonthly(limits.monthly))

  def estimateLimitsChange[LT <: LimitPeriodType](
      limits: Limits[SessionDuration],
      asOf: OffsetDateTime,
      clock: Clock): EffectiveLimits[SessionDuration] =
    limitsLog.estimateLimitsChange(limits, asOf, clock)

  def recalculateSessionLimitation(
      limits: EffectiveLimits[SessionDuration],
      recalculationTime: OffsetDateTime,
      clock: Clock): Option[PunterState.StartedSession] = {
    val withLimits = changeLimits(limits)
    withLimits.getCurrentSession.map { session =>
      val newLimitation = SessionLimitation.fromStats(
        withLimits.sessionStats(asOf = recalculationTime, clock),
        session.limitation.refreshTokenTimeout)
      session.copy(limitation = newLimitation)
    }
  }

  def sessionStats(asOf: OffsetDateTime, clock: Clock): PunterSessionStats =
    PunterSessionStats(
      sessionUsage = sessionsLog.calculateSessionUsage(asOf, clock),
      sessionLimits = limits(asOf, clock),
      asOf)

  def limits(asOf: OffsetDateTime, clock: Clock): CurrentAndNextLimits[SessionDuration] =
    CurrentAndNextLimits(
      daily = limitsLog.getDaily(asOf, clock),
      weekly = limitsLog.getWeekly(asOf, clock),
      monthly = limitsLog.getMonthly(asOf, clock))

  def getCurrentSession: Option[PunterState.StartedSession] =
    sessionsLog.activeSession

  def getEndedSessions: List[PunterState.EndedSession] =
    sessionsLog.endedSessions

  def startSession(session: PunterState.StartedSession): PunterSessions =
    copy(sessionsLog = sessionsLog.startSession(session))

  def modifyCurrentSession(session: PunterState.StartedSession): PunterSessions =
    copy(sessionsLog = sessionsLog.modifyStartedSession(session))

  def endCurrentSession(endedAt: OffsetDateTime): PunterSessions =
    copy(sessionsLog = sessionsLog.endCurrentSession(endedAt))
}

object PunterSessions {
  def withLimits(initialSessionLimits: Limits[SessionDuration]): PunterSessions =
    new PunterSessions(limitsLog = LimitsLog.withLimits(initialSessionLimits), sessionsLog = PunterSessionsLog.empty)
}

sealed trait SessionLimitation {
  val refreshTokenTimeout: OffsetDateTime
  def updateRefreshTokentimeout(refreshTokenTimeout: OffsetDateTime): SessionLimitation
}
object SessionLimitation {

  def fromStats(stats: PunterSessionStats, refreshTokenTimeout: OffsetDateTime): SessionLimitation =
    stats.estimateLimitExcess match {
      case Some(excess) =>
        Limited(
          canBeActiveUntil = excess.exceedsAt,
          coolOffUntil = excess.exceededPeriod.endExclusive,
          refreshTokenTimeout = refreshTokenTimeout)
      case None => Unlimited(refreshTokenTimeout)
    }

  final case class Unlimited(refreshTokenTimeout: OffsetDateTime) extends SessionLimitation {
    override def updateRefreshTokentimeout(refreshTokenTimeout: OffsetDateTime): SessionLimitation =
      this.copy(refreshTokenTimeout = refreshTokenTimeout)
  }
  final case class Limited(
      canBeActiveUntil: OffsetDateTime,
      coolOffUntil: OffsetDateTime,
      refreshTokenTimeout: OffsetDateTime)
      extends SessionLimitation {
    override def updateRefreshTokentimeout(refreshTokenTimeout: OffsetDateTime): SessionLimitation =
      this.copy(refreshTokenTimeout = refreshTokenTimeout)
  }
}

final case class PunterSessionStats(
    sessionUsage: SessionUsage,
    sessionLimits: CurrentAndNextLimits[SessionDuration],
    asOf: OffsetDateTime) {
  private lazy val daily = UsageWithLimit(sessionUsage.daily, sessionLimits.daily)
  private lazy val weekly = UsageWithLimit(sessionUsage.weekly, sessionLimits.weekly)
  private lazy val monthly = UsageWithLimit(sessionUsage.monthly, sessionLimits.monthly)

  private lazy val periods: List[UsageWithLimit[LimitPeriodType]] = List(daily, weekly, monthly)

  def estimateLimitExcess: Option[LimitExcessEstimation] =
    Try((currentPeriodEstimations() ++ nextPeriodEstimations()).minBy(_.exceedsAt)).toOption

  private def currentPeriodEstimations(): List[LimitExcessEstimation] =
    periods.flatMap(_.currentPeriodExcess(sessionStartedAt = asOf))

  private def nextPeriodEstimations(): List[LimitExcessEstimation] =
    periods.flatMap(_.nextPeriodExcess)
}

private final case class UsageWithLimit[+LT <: LimitPeriodType](
    usage: PeriodSessionUsage[LT],
    periodLimits: CurrentAndNextLimit[SessionDuration, LT]) {

  def currentPeriodExcess(sessionStartedAt: OffsetDateTime): Option[LimitExcessEstimation] =
    for {
      maxSessionDurationForCurrentPeriod <- periodLimits.current.limit.value
      usageLeft = usageLeftAccordingToLimit(maxSessionDurationForCurrentPeriod)
      estimation = LimitExcessEstimation(exceedsAt = sessionStartedAt + usageLeft, exceededPeriod = currentLimitPeriod)
      if mightBeExceededWith(sessionStartedAt, usageLeft)
    } yield estimation

  private def usageLeftAccordingToLimit(limit: SessionDuration): SessionDuration =
    SessionDuration.max(SessionDuration.monoid.empty, limit - usage.value)

  private def mightBeExceededWith(sessionStartedAt: OffsetDateTime, usageLeft: SessionDuration): Boolean =
    usageLeft < SessionDuration.from(sessionStartedAt, currentLimitPeriod.endExclusive)

  private def currentLimitPeriod: LimitPeriod[LT] = usage.period

  def nextPeriodExcess: Option[LimitExcessEstimation] = {
    val nextLimit = periodLimits.next.getOrElse(periodLimits.current).limit
    nextLimit.value.map(
      maxDurationInPeriod =>
        LimitExcessEstimation(
          exceedsAt = nextLimitPeriod.startInclusive + maxDurationInPeriod,
          exceededPeriod = nextLimitPeriod))
  }

  private def nextLimitPeriod: LimitPeriod[LT] = usage.period.next
}

final case class LimitExcessEstimation(exceedsAt: OffsetDateTime, exceededPeriod: LimitPeriod[LimitPeriodType])
