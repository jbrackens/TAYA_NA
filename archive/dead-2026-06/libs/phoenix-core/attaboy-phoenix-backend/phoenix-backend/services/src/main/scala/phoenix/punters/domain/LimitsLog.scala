package phoenix.punters.domain

import java.time.Instant
import java.time.OffsetDateTime
import java.time.ZoneOffset

import scala.math.Ordered.orderingToOrdered

import cats.Monoid

import phoenix.core.Clock
import phoenix.punters.domain.LimitPeriodType.Day
import phoenix.punters.domain.LimitPeriodType.Month
import phoenix.punters.domain.LimitPeriodType.Week

final case class LimitsLog[V](
    dailyLog: List[EffectiveLimit[V, Day.type]],
    weeklyLog: List[EffectiveLimit[V, Week.type]],
    monthlyLog: List[EffectiveLimit[V, Month.type]]) {

  def estimateLimitsChange[LT <: LimitPeriodType](limits: Limits[V], asOf: OffsetDateTime, clock: Clock)(implicit
      ordering: Ordering[V],
      monoid: Monoid[V]): EffectiveLimits[V] = {
    val dailyLimits = getDaily(asOf, clock)
    val currentDay = LimitPeriod.enclosingDay(asOf, clock)
    val effectiveDaily = estimateEffectiveness(dailyLimits.current, limits.daily, currentDay, asOf)

    val weeklyLimits = getWeekly(asOf, clock)
    val currentWeek = LimitPeriod.enclosingWeek(asOf, clock)
    val effectiveWeekly = estimateEffectiveness(weeklyLimits.current, limits.weekly, currentWeek, asOf)

    val monthlyLimits = getMonthly(asOf, clock)
    val currentMonth = LimitPeriod.enclosingMonth(asOf, clock)
    val effectiveMonthly = estimateEffectiveness(monthlyLimits.current, limits.monthly, currentMonth, asOf)

    EffectiveLimits(effectiveDaily, effectiveWeekly, effectiveMonthly)
  }

  private def estimateEffectiveness[LT <: LimitPeriodType](
      previousLimit: EffectiveLimit[V, LT],
      newLimit: Limit[V, LT],
      currentPeriod: LimitPeriod[LT],
      requestedAt: OffsetDateTime)(implicit ordering: Ordering[V], monoid: Monoid[V]): EffectiveLimit[V, LT] = {

    val effectiveDate =
      (previousLimit.limit, newLimit) match {
        case (previous, _) if previous.isUnlimited                                 => requestedAt
        case (previous, newLimit) if !previous.isUnlimited && newLimit.isUnlimited => currentPeriod.next.startInclusive
        case (previous, newLimit) if previous >= newLimit                          => requestedAt
        case (_, _) /* if previous < newLimit */                                   => currentPeriod.next.startInclusive
      }

    EffectiveLimit(newLimit, effectiveDate)
  }

  def getDaily(asOf: OffsetDateTime, clock: Clock): CurrentAndNextLimit[V, Day.type] =
    findPeriodicLimits(dailyLog, asOf, LimitPeriod.enclosingDay(asOf, clock))

  def withDaily(daily: EffectiveLimit[V, Day.type]): LimitsLog[V] =
    copy(dailyLog = newestLimitsFirst(replaceByDate(dailyLog, daily)))

  def getWeekly(asOf: OffsetDateTime, clock: Clock): CurrentAndNextLimit[V, Week.type] =
    findPeriodicLimits(weeklyLog, asOf, LimitPeriod.enclosingWeek(asOf, clock))

  def withWeekly(weekly: EffectiveLimit[V, Week.type]): LimitsLog[V] =
    copy(weeklyLog = newestLimitsFirst(replaceByDate(weeklyLog, weekly)))

  def getMonthly(asOf: OffsetDateTime, clock: Clock): CurrentAndNextLimit[V, Month.type] =
    findPeriodicLimits(monthlyLog, asOf, LimitPeriod.enclosingMonth(asOf, clock))

  def withMonthly(monthly: EffectiveLimit[V, Month.type]): LimitsLog[V] =
    copy(monthlyLog = newestLimitsFirst(replaceByDate(monthlyLog, monthly)))

  def limits(asOf: OffsetDateTime, clock: Clock)(implicit ordering: Ordering[V]): Limits[V] =
    Limits.unsafe(
      daily = getDaily(asOf, clock).current.limit,
      weekly = getWeekly(asOf, clock).current.limit,
      monthly = getMonthly(asOf, clock).current.limit)

  private def replaceByDate[LT <: LimitPeriodType](
      limits: List[EffectiveLimit[V, LT]],
      limit: EffectiveLimit[V, LT]): List[EffectiveLimit[V, LT]] =
    limits.filterNot(_.since >= limit.since) :+ limit

  private def newestLimitsFirst[LT <: LimitPeriodType](
      limits: List[EffectiveLimit[V, LT]]): List[EffectiveLimit[V, LT]] =
    limits.sorted(LimitsLog.newestLimitsFirst[V, LT])

  private def findPeriodicLimits[LT <: LimitPeriodType](
      limits: List[EffectiveLimit[V, LT]],
      asOf: OffsetDateTime,
      currentPeriod: LimitPeriod[LT]): CurrentAndNextLimit[V, LT] = {
    val nextPeriod = currentPeriod.next
    CurrentAndNextLimit[V, LT](
      current = limits.filter(_.since <= asOf).head,
      next = limits.find(limit => limit.since >= nextPeriod.startInclusive && limit.since < nextPeriod.endExclusive))
  }

  def periodicLimits(asOf: OffsetDateTime, clock: Clock): CurrentAndNextLimits[V] =
    CurrentAndNextLimits(
      daily = getDaily(asOf, clock),
      weekly = getWeekly(asOf, clock),
      monthly = getMonthly(asOf, clock))

  def changeLimits(limits: EffectiveLimits[V]): LimitsLog[V] =
    withDaily(limits.daily).withWeekly(limits.weekly).withMonthly(limits.monthly)
}

object LimitsLog {
  def apply[V](
      daily: EffectiveLimit[V, Day.type],
      weekly: EffectiveLimit[V, Week.type],
      monthly: EffectiveLimit[V, Month.type]): LimitsLog[V] = {
    new LimitsLog[V](List(daily), List(weekly), List(monthly))
  }

  def withLimits[V](limits: Limits[V]): LimitsLog[V] = {
    val alwaysEffective = OffsetDateTime.ofInstant(Instant.EPOCH, ZoneOffset.UTC)
    LimitsLog(
      EffectiveLimit(limits.daily, alwaysEffective),
      EffectiveLimit(limits.weekly, alwaysEffective),
      EffectiveLimit(limits.monthly, alwaysEffective))
  }

  private def newestLimitsFirst[V, LT <: LimitPeriodType]: Ordering[EffectiveLimit[V, LT]] =
    Ordering.by[EffectiveLimit[V, LT], OffsetDateTime](_.since).reverse
}
