package phoenix.core.scheduler

import java.time.Duration
import java.time.OffsetDateTime
import java.time.temporal.TemporalAdjusters
import java.util.concurrent.TimeUnit

import scala.concurrent.duration.FiniteDuration
import scala.concurrent.duration._
import scala.math.Ordered.orderingToOrdered

import phoenix.core.TimeUtils._
import phoenix.core.scheduler.ExecutionSchedule.Daily
import phoenix.core.scheduler.ExecutionSchedule.Monthly
import phoenix.core.scheduler.ExecutionSchedule.Recurring
import phoenix.core.scheduler.ExecutionSchedule.Weekly

private final case class JobExecution(
    calculatedAt: OffsetDateTime,
    firstExecution: OffsetDateTime,
    subsequentExecutionsInterval: FiniteDuration,
    shouldExecuteAt: OffsetDateTime => Boolean) {

  def initialDelay: FiniteDuration =
    FiniteDuration(Duration.between(calculatedAt, firstExecution).toNanos, TimeUnit.NANOSECONDS)
}

private object JobExecutionCalculator {
  def calculateExecution(asOf: OffsetDateTime, executionSchedule: ExecutionSchedule): JobExecution =
    executionSchedule match {
      case schedule: ExecutionSchedule.Recurring => recurringExecution(asOf, schedule)
      case schedule: ExecutionSchedule.Daily     => dailyExecution(asOf, schedule)
      case schedule: ExecutionSchedule.Weekly    => weeklyExecution(asOf, schedule)
      case schedule: ExecutionSchedule.Monthly   => monthlyExecution(asOf, schedule)
    }

  private def recurringExecution(asOf: OffsetDateTime, schedule: Recurring): JobExecution =
    JobExecution(
      calculatedAt = asOf,
      firstExecution = asOf,
      subsequentExecutionsInterval = schedule.every,
      shouldExecuteAt = _ => true)

  private def dailyExecution(asOf: OffsetDateTime, schedule: Daily): JobExecution = {
    val sameDayExecution = asOf.withTime(schedule.startTime)
    val nextExecution = if (asOf <= sameDayExecution) sameDayExecution else sameDayExecution.plusDays(1)

    JobExecution(
      calculatedAt = asOf,
      firstExecution = nextExecution,
      subsequentExecutionsInterval = 1.day,
      shouldExecuteAt = _ => true)
  }

  private def weeklyExecution(asOf: OffsetDateTime, schedule: Weekly): JobExecution = {
    val sameWeekExecution =
      asOf.`with`(TemporalAdjusters.previousOrSame(schedule.dayOfWeek)).withTime(schedule.startTime)
    val nextExecution = if (asOf <= sameWeekExecution) sameWeekExecution else sameWeekExecution.plusWeeks(1)

    JobExecution(
      calculatedAt = asOf,
      firstExecution = nextExecution,
      subsequentExecutionsInterval = 7.days,
      shouldExecuteAt = _.getDayOfWeek == schedule.dayOfWeek)
  }

  private def monthlyExecution(asOf: OffsetDateTime, schedule: Monthly): JobExecution = {
    val sameMonthExecution = asOf.withDayOfMonth(schedule.dayOfMonth).withTime(schedule.startTime)
    val nextExecution = if (asOf <= sameMonthExecution) sameMonthExecution else sameMonthExecution.plusMonths(1)

    JobExecution(
      calculatedAt = asOf,
      firstExecution = nextExecution,
      // months have variable length, so we execute it daily with a predicate instead
      subsequentExecutionsInterval = 1.day,
      shouldExecuteAt = _.getDayOfMonth == schedule.dayOfMonth)
  }
}
