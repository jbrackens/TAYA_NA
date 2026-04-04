package phoenix.punters.domain

import java.time.OffsetDateTime

import scala.math.Ordering.Implicits.infixOrderingOps

import cats.syntax.foldable._
import org.slf4j.Logger
import org.slf4j.LoggerFactory

import phoenix.core.Clock
import phoenix.core.ScalaObjectUtils._
import phoenix.punters.PunterState
import phoenix.punters.domain.LimitPeriodType.Day
import phoenix.punters.domain.LimitPeriodType.Month
import phoenix.punters.domain.LimitPeriodType.Week
import phoenix.punters.domain.PunterSessionsLog.log

final case class PunterSessionsLog(
    endedSessions: List[PunterState.EndedSession],
    activeSession: Option[PunterState.StartedSession]) {

  def calculateSessionUsage(asOf: OffsetDateTime, clock: Clock): SessionUsage =
    SessionUsage(
      daily = sessionUsageDuring(EnclosingLimitPeriod(LimitPeriod.enclosingDay(asOf, clock), asOf)),
      weekly = sessionUsageDuring(EnclosingLimitPeriod(LimitPeriod.enclosingWeek(asOf, clock), asOf)),
      monthly = sessionUsageDuring(EnclosingLimitPeriod(LimitPeriod.enclosingMonth(asOf, clock), asOf)))

  private def sessionUsageDuring[LT <: LimitPeriodType](
      enclosingPeriod: EnclosingLimitPeriod[LT]): PeriodSessionUsage[LT] =
    PeriodSessionUsage(
      enclosingPeriod.period,
      endedSessionsUsageDuring(enclosingPeriod) + activeSessionUsageDuring(enclosingPeriod))

  private def endedSessionsUsageDuring(limitPeriod: EnclosingLimitPeriod[_]): SessionDuration =
    endedSessions
      .filter(_.isTimeRestricted)
      .filter(startsBeforePeriodEnd(limitPeriod, _))
      .filter(endsAfterPeriodStart(limitPeriod, _))
      .map(sessionUsageDuringPeriod(limitPeriod, _))
      .combineAll

  private def activeSessionUsageDuring(limitPeriod: EnclosingLimitPeriod[_]): SessionDuration = {
    activeSession.filter(_.isTimeRestricted).fold(SessionDuration.monoid.empty) { startedSession =>
      SessionDuration.max(
        SessionDuration.monoid.empty,
        SessionDuration.from(limitPeriod.periodStart.max(startedSession.startedAt), limitPeriod.periodTime))
    }
  }

  private def startsBeforePeriodEnd(period: EnclosingLimitPeriod[_], session: PunterState.EndedSession): Boolean =
    session.startedAt < period.periodEnd

  private def endsAfterPeriodStart(period: EnclosingLimitPeriod[_], session: PunterState.EndedSession): Boolean =
    session.endedAt >= period.periodStart

  private def sessionUsageDuringPeriod(
      period: EnclosingLimitPeriod[_],
      session: PunterState.EndedSession): SessionDuration =
    SessionDuration.from(session.startedAt.max(period.periodStart), session.endedAt.min(period.periodEnd))

  def startSession(session: PunterState.StartedSession): PunterSessionsLog =
    activeSession match {
      case Some(session) =>
        log.debug(s"Attempt to start a session, but session $session already present")
        this

      case None =>
        copy(activeSession = Some(session))
    }

  def modifyStartedSession(session: PunterState.StartedSession): PunterSessionsLog =
    activeSession match {
      case Some(_) =>
        copy(activeSession = Some(session))

      case None =>
        log.debug("Attempt to modify started session, but no active session present")
        this
    }

  def endCurrentSession(endedAt: OffsetDateTime): PunterSessionsLog =
    activeSession match {
      case Some(activeSession) =>
        val ended = activeSession.end(endedAt)
        copy(endedSessions = endedSessions :+ ended, activeSession = None)

      case None =>
        log.debug("Attempt to end a session, but no active session present")
        this
    }
}

object PunterSessionsLog {
  private val log: Logger = LoggerFactory.getLogger(this.objectName)
  val empty: PunterSessionsLog = PunterSessionsLog(endedSessions = List.empty, activeSession = None)
}

private[domain] final case class SessionUsage(
    daily: PeriodSessionUsage[Day.type],
    weekly: PeriodSessionUsage[Week.type],
    monthly: PeriodSessionUsage[Month.type])

private[domain] final case class PeriodSessionUsage[+LT <: LimitPeriodType](
    period: LimitPeriod[LT],
    value: SessionDuration)

private[domain] final case class EnclosingLimitPeriod[+LT <: LimitPeriodType](
    period: LimitPeriod[LT],
    periodTime: OffsetDateTime) {

  def periodStart: OffsetDateTime = period.startInclusive
  def periodEnd: OffsetDateTime = period.endExclusive
}
