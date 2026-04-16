package phoenix.reports.domain.model

import java.time.DayOfWeek
import java.time.OffsetDateTime
import java.time.temporal.ChronoUnit
import java.time.temporal.TemporalAdjusters

import phoenix.core.Clock

sealed trait ReportingPeriod {
  type self
  def previous: self

  def periodStart: OffsetDateTime
  def periodEnd: OffsetDateTime
}

object ReportingPeriod {
  final case class Day(periodStart: OffsetDateTime, periodEnd: OffsetDateTime) extends ReportingPeriod {
    override type self = Day
    override def previous: Day = Day(periodStart = periodStart.minusDays(1), periodEnd = periodStart)
  }
  final case class Week(periodStart: OffsetDateTime, periodEnd: OffsetDateTime) extends ReportingPeriod {
    override type self = Week
    override def previous: Week = Week(periodStart = periodStart.minusWeeks(1), periodEnd = periodStart)
  }
  final case class Month(periodStart: OffsetDateTime, periodEnd: OffsetDateTime) extends ReportingPeriod {
    override type self = Month
    override def previous: Month = Month(periodStart = periodStart.minusMonths(1), periodEnd = periodStart)
  }

  def enclosingDay(asOf: OffsetDateTime, clock: Clock): Day = {
    val startOfDay = clock.adjustToClockZone(asOf).truncatedTo(ChronoUnit.DAYS)
    fromStartOfDayUnsafe(startOfDay)
  }

  def enclosingDay(clock: Clock): Day =
    enclosingDay(asOf = clock.currentOffsetDateTime(), clock)

  def previousDay(asOf: OffsetDateTime, clock: Clock): Day =
    enclosingDay(asOf, clock).previous

  def previousDay(clock: Clock): Day =
    enclosingDay(clock).previous

  def enclosingWeek(date: OffsetDateTime, clock: Clock): Week = {
    val startOfWeek = clock
      .adjustToClockZone(date)
      .`with`(TemporalAdjusters.previousOrSame(DayOfWeek.MONDAY))
      .truncatedTo(ChronoUnit.DAYS)
    val endOfWeek = startOfWeek.plusWeeks(1)
    Week(startOfWeek, endOfWeek)
  }

  def enclosingWeek(clock: Clock): Week =
    enclosingWeek(clock.currentOffsetDateTime(), clock)

  def previousWeek(asOf: OffsetDateTime, clock: Clock): Week =
    enclosingWeek(asOf, clock).previous

  def previousWeek(clock: Clock): Week =
    enclosingWeek(clock).previous

  def enclosingMonth(asOf: OffsetDateTime, clock: Clock): Month = {
    val startOfMonth = clock.adjustToClockZone(asOf).withDayOfMonth(1).truncatedTo(ChronoUnit.DAYS)
    val endOfMonth = startOfMonth.plusMonths(1)
    Month(startOfMonth, endOfMonth)
  }

  def enclosingMonth(clock: Clock): Month =
    enclosingMonth(clock.currentOffsetDateTime(), clock)

  def previousMonth(asOf: OffsetDateTime, clock: Clock): Month =
    enclosingMonth(asOf, clock).previous

  def previousMonth(clock: Clock): Month =
    enclosingMonth(clock).previous

  def fromStartOfDayUnsafe(startOfDay: OffsetDateTime): Day = {
    val endOfDay = startOfDay.plusDays(1)
    Day(startOfDay, endOfDay)
  }
}
