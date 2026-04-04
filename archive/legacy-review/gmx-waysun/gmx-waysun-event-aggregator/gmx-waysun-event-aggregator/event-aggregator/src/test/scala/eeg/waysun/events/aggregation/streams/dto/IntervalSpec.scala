package eeg.waysun.events.aggregation.streams.dto

import stella.dataapi.aggregation.IntervalType
import eeg.waysun.events.aggregation.functions.DetailedDateTime
import eeg.waysun.events.aggregation.functions.OffsetDateTimeOps._
import net.flipsports.gmx.streaming.tests.StreamingTestBase
import org.scalatest.MustMatchers.convertToAnyMustWrapper

import java.time.Instant.parse

class IntervalSpec extends StreamingTestBase {

  "Interval" should {

    "increment from date" in {
      // given
      val startDate = parse("2021-01-01T00:01:00Z")
      val offsetDateTime = DetailedDateTime(startDate.toEpochMilli).asOffsetDateTime
      // when
      val month = offsetDateTime.increment(IntervalType.MONTHS)
      val day = offsetDateTime.increment(IntervalType.DAYS)
      val hour = offsetDateTime.increment(IntervalType.HOURS)
      val minutes = offsetDateTime.increment(IntervalType.MINUTES)
      //then
      month.toInstant.toEpochMilli must be(parse("2021-02-01T00:01:00Z").toEpochMilli)
      day.toInstant.toEpochMilli must be(parse("2021-01-02T00:01:00Z").toEpochMilli)
      hour.toInstant.toEpochMilli must be(parse("2021-01-01T01:01:00Z").toEpochMilli)
      minutes.toInstant.toEpochMilli must be(parse("2021-01-01T00:02:00Z").toEpochMilli)
    }

    "transform from long to date with truncated rest" in {
      import eeg.waysun.events.aggregation.functions.OffsetDateTimeOps._
      // given
      val seconds = parse("2021-01-01T15:15:13Z")
      val startDate = parse("2021-01-01T00:00:00Z")

      // when
      val day = seconds.toEpochMilli.truncated(Interval(IntervalType.DAYS.name, 1))

      //then
      day.toInstant.toEpochMilli must be(startDate.toEpochMilli)
    }
  }
}
