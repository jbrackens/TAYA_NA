package eeg.waysun.events.aggregation.functions

import eeg.waysun.events.aggregation.functions.OffsetDateTimeOps._
import eeg.waysun.events.aggregation.streams.dto.{Interval, Window}

case class WindowRangeCalculator(rangeStart: Long, interval: Interval) {

  def calculate(eventDate: Long = rangeStart): Window = {
    val referenceDate = DetailedDateTime(rangeStart).asOffsetDateTime
    val eventOccurrence = DetailedDateTime(eventDate).asOffsetDateTime
    val calculatedNumberOfPeriodBetween = referenceDate.between(eventOccurrence, interval)
    val (numberOfPeriodsBetween) = if (calculatedNumberOfPeriodBetween == 0) {
      0L
    } else {
      Math.floor(calculatedNumberOfPeriodBetween / interval.intervalLength).floor.toLong
    }

    val left = referenceDate.increment(interval.intervalType, numberOfPeriodsBetween)
    val right = left.increment(interval.intervalType, interval.intervalLength)
    Window(left, right, interval, calculatedNumberOfPeriodBetween + 1)
  }
}

object WindowRangeCalculator {

  def apply(rangeStart: Long, interval: Interval): WindowRangeCalculator =
    new WindowRangeCalculator(rangeStart, interval)
}
