package eeg.waysun.events.aggregation.functions

import stella.dataapi.aggregation.IntervalType
import eeg.waysun.events.aggregation.streams.dto.Interval
import net.flipsports.gmx.streaming.common.conversion.DateFormats
import net.flipsports.gmx.streaming.tests.StreamingTestBase
import org.scalatest.MustMatchers.convertToAnyMustWrapper

import java.time.{Duration, Instant}

class WindowRangeCalculatorSpec extends StreamingTestBase {

  "Window range calculator " should {

    "calculate initial window" in {
      // given
      val hours = 1
      val startDate = Instant.now().atZone(DateFormats.zone).toInstant
      val interval = Interval(IntervalType.HOURS.name(), hours)
      val calculator = WindowRangeCalculator(startDate.toEpochMilli, interval)

      // when
      val initialWindow = calculator.calculate(startDate.toEpochMilli)

      // then
      val expectedEndDate = DetailedDateTime(startDate.plus(Duration.ofHours(hours)).toEpochMilli)
      initialWindow.index must be(1)
      initialWindow.endDate.toInstant.toEpochMilli must be(expectedEndDate.asOffsetDateTime.toInstant.toEpochMilli)
    }

    "calculate event window related to start date" in {
      import OffsetDateTimeOps._
      val intervalHours = 1
      val eventOccurrenceHours = 5
      val windowEndIndex = 6
      val startDate = Instant.now().atZone(DateFormats.zone).toInstant
      val interval = Interval(IntervalType.HOURS.name(), intervalHours)
      val calculator = WindowRangeCalculator(startDate.toEpochMilli, interval)
      val eventDate =
        DetailedDateTime(startDate.toEpochMilli).asOffsetDateTime.increment(IntervalType.HOURS, eventOccurrenceHours)

      // when
      val initialWindow = calculator.calculate(eventDate.toInstant.toEpochMilli)

      // then
      initialWindow.index must be(windowEndIndex)
      val expectedWindowEndDate =
        DetailedDateTime(startDate.toEpochMilli).asOffsetDateTime.increment(IntervalType.HOURS, windowEndIndex)
      initialWindow.endDate.toInstant.toEpochMilli must be(expectedWindowEndDate.toInstant.toEpochMilli)

    }
  }
}
