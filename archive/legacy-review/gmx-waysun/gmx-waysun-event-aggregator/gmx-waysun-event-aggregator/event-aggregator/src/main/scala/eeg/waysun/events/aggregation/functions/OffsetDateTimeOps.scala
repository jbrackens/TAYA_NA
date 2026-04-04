package eeg.waysun.events.aggregation.functions

import stella.dataapi.aggregation.IntervalType
import eeg.waysun.events.aggregation.streams.dto.Interval
import org.apache.flink.annotation.VisibleForTesting

import java.time.temporal.ChronoUnit
import java.time.{OffsetDateTime, ZoneOffset}

object OffsetDateTimeOps {

  implicit class OffsetDateTimeOperations(val reference: OffsetDateTime) {

    def between(candidate: OffsetDateTime, interval: Interval): Long = interval.intervalType match {
      case IntervalType.DAYS    => ChronoUnit.DAYS.between(reference, candidate)
      case IntervalType.HOURS   => ChronoUnit.HOURS.between(reference, candidate)
      case IntervalType.NEVER   => Long.MaxValue
      case IntervalType.MONTHS  => ChronoUnit.MONTHS.between(reference, candidate)
      case IntervalType.MINUTES => ChronoUnit.MINUTES.between(reference, candidate)
    }

    def increment(intervalType: IntervalType, length: Long = 1): OffsetDateTime = intervalType match {
      case IntervalType.DAYS    => reference.plusDays(length)
      case IntervalType.HOURS   => reference.plusHours(length)
      case IntervalType.NEVER   => OffsetDateTime.MAX
      case IntervalType.MONTHS  => reference.plusMonths(length)
      case IntervalType.MINUTES => reference.plusMinutes(length)
    }
  }

  implicit class LongToOffsetDateTimeTransformation(val candidate: Long) {
    def asOffsetDateTime(): OffsetDateTime = DetailedDateTime(candidate).asOffsetDateTime

    @VisibleForTesting
    def truncated(interval: Interval): OffsetDateTime = {
      val item = DetailedDateTime(candidate)
      interval.intervalType match {
        case IntervalType.DAYS => OffsetDateTime.of(item.year, item.month, item.day, 0, 0, 0, 0, ZoneOffset.UTC)
        case IntervalType.HOURS =>
          OffsetDateTime.of(item.year, item.month, item.day, item.hour, 0, 0, 0, ZoneOffset.UTC)
        case IntervalType.NEVER  => if (item.dateTime == Long.MinValue) OffsetDateTime.MIN else OffsetDateTime.MAX
        case IntervalType.MONTHS => OffsetDateTime.of(item.year, item.month, 1, 0, 0, 0, 0, ZoneOffset.UTC)
        case IntervalType.MINUTES =>
          OffsetDateTime.of(item.year, item.month, item.day, item.hour, item.minute, 0, 0, ZoneOffset.UTC)
      }
    }
  }

}
