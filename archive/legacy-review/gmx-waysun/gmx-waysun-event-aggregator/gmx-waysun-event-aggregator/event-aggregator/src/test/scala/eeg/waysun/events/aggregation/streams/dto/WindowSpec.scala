package eeg.waysun.events.aggregation.streams.dto

import net.flipsports.gmx.streaming.tests.StreamingTestBase
import org.scalatest.MustMatchers.convertToAnyMustWrapper

import java.time.OffsetDateTime
import java.time.OffsetDateTime.parse
import java.time.format.DateTimeFormatter

class WindowSpec extends StreamingTestBase {

  "window" should {
    val anyInterval = Interval("DAYS", 0)
    "be in range" in {
      // given
      val left = parse("2021-01-01T00:01:00+01:00", DateTimeFormatter.ISO_OFFSET_DATE_TIME)
      val right = parse("2021-01-03T00:01:00+01:00", DateTimeFormatter.ISO_OFFSET_DATE_TIME)

      // when and then

      Window(left, right, anyInterval).inWindow(
        parse("2021-01-01T00:01:00+01:00", DateTimeFormatter.ISO_OFFSET_DATE_TIME)) must be(true)
      Window(left, right, anyInterval).inWindow(
        parse("2021-01-02T00:01:00+01:00", DateTimeFormatter.ISO_OFFSET_DATE_TIME)) must be(true)
      Window(left, right, anyInterval).inWindow(
        parse("2021-01-03T00:01:00+01:00", DateTimeFormatter.ISO_OFFSET_DATE_TIME)) must be(false)
      Window(left, right, anyInterval).inWindow(
        parse("2021-01-04T00:04:00+01:00", DateTimeFormatter.ISO_OFFSET_DATE_TIME)) must be(false)
    }

    "date far future and not fail" in {
      // given

      val left = parse("2021-01-01T00:01:00+01:00", DateTimeFormatter.ISO_OFFSET_DATE_TIME)
      val right = parse(OffsetDateTime.MAX.toString, DateTimeFormatter.ISO_OFFSET_DATE_TIME)

      // when and then

      Window(left, right, anyInterval).inWindow(
        parse("2022-01-01T00:01:00+01:00", DateTimeFormatter.ISO_OFFSET_DATE_TIME)) must be(true)

    }

    "date far beginning of time and not fail" in {
      // given

      val left = parse(OffsetDateTime.MIN.toString, DateTimeFormatter.ISO_OFFSET_DATE_TIME)
      val right = parse(OffsetDateTime.MAX.toString, DateTimeFormatter.ISO_OFFSET_DATE_TIME)

      // when and then

      Window(left, right, anyInterval).inWindow(
        parse("2022-01-01T00:01:00+01:00", DateTimeFormatter.ISO_OFFSET_DATE_TIME)) must be(true)

    }
  }
}
