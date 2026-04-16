package phoenix.reports.unit

import java.time.OffsetDateTime
import java.time.ZoneId

import org.scalatest.matchers.should.Matchers
import org.scalatest.wordspec.AnyWordSpecLike

import phoenix.core.Clock
import phoenix.reports.domain.model.ReportingPeriod

final class ReportingPeriodSpec extends AnyWordSpecLike with Matchers {

  val utcClock: Clock = Clock.utcClock
  val newJerseyClock: Clock = Clock.forZone(ZoneId.of("US/Eastern"))

  "when calculating daily periods" should {
    "properly calculate enclosing day" in {
      // given
      val pointInTime = OffsetDateTime.parse("2021-10-13T14:32:53Z")

      // when
      val enclosingDay = ReportingPeriod.enclosingDay(pointInTime, utcClock)

      // then
      enclosingDay.periodStart shouldBe OffsetDateTime.parse("2021-10-13T00:00:00Z")
      enclosingDay.periodEnd shouldBe OffsetDateTime.parse("2021-10-14T00:00:00Z")
    }

    "properly calculate previous day" in {
      // given
      val pointInTime = OffsetDateTime.parse("2021-10-13T14:32:53Z")

      // when
      val previousDay = ReportingPeriod.previousDay(pointInTime, utcClock)

      // then
      previousDay.periodStart shouldBe OffsetDateTime.parse("2021-10-12T00:00:00Z")
      previousDay.periodEnd shouldBe OffsetDateTime.parse("2021-10-13T00:00:00Z")
    }

    "should take system timezone into account" in {
      // given
      val pointInTime = OffsetDateTime.parse("2021-10-13T03:59:59Z")

      // when
      val enclosingDay = ReportingPeriod.enclosingDay(pointInTime, newJerseyClock)

      // then
      enclosingDay.periodStart shouldBe OffsetDateTime.parse("2021-10-12T00:00-04:00")
      enclosingDay.periodEnd shouldBe OffsetDateTime.parse("2021-10-13T00:00-04:00")
    }
  }

  "when calculating weekly periods" should {
    "properly calculate enclosing week" in {
      // given
      val pointInTime = OffsetDateTime.parse("2022-01-09T23:59:59Z")

      // when
      val enclosingWeek = ReportingPeriod.enclosingWeek(pointInTime, utcClock)

      // then
      enclosingWeek.periodStart shouldBe OffsetDateTime.parse("2022-01-03T00:00:00Z")
      enclosingWeek.periodEnd shouldBe OffsetDateTime.parse("2022-01-10T00:00:00Z")
    }

    "properly calculate previous week" in {
      // given
      val pointInTime = OffsetDateTime.parse("2022-01-09T23:59:59Z")

      // when
      val previousWeek = ReportingPeriod.previousWeek(pointInTime, utcClock)

      // then
      previousWeek.periodStart shouldBe OffsetDateTime.parse("2021-12-27T00:00:00Z")
      previousWeek.periodEnd shouldBe OffsetDateTime.parse("2022-01-03T00:00:00Z")
    }

    "should take system timezone into account" in {
      // given
      val pointInTime = OffsetDateTime.parse("2021-10-11T03:59:59Z")

      // when
      val enclosingWeek = ReportingPeriod.enclosingWeek(pointInTime, newJerseyClock)

      // then
      enclosingWeek.periodStart shouldBe OffsetDateTime.parse("2021-10-04T00:00-04:00")
      enclosingWeek.periodEnd shouldBe OffsetDateTime.parse("2021-10-11T00:00-04:00")
    }

  }

  "when calculating monthly periods" should {
    "properly calculate enclosing month" in {
      // given
      val pointInTime = OffsetDateTime.parse("2022-03-31T23:59:59Z")

      // when
      val enclosingMonth = ReportingPeriod.enclosingMonth(pointInTime, utcClock)

      // then
      enclosingMonth.periodStart shouldBe OffsetDateTime.parse("2022-03-01T00:00:00Z")
      enclosingMonth.periodEnd shouldBe OffsetDateTime.parse("2022-04-01T00:00:00Z")
    }

    "properly calculate previous month" in {
      // given
      val pointInTime = OffsetDateTime.parse("2022-03-31T23:59:59Z")

      // when
      val previousMonth = ReportingPeriod.previousMonth(pointInTime, utcClock)

      // then
      previousMonth.periodStart shouldBe OffsetDateTime.parse("2022-02-01T00:00:00Z")
      previousMonth.periodEnd shouldBe OffsetDateTime.parse("2022-03-01T00:00:00Z")
    }

    "should take system timezone into account" in {
      // given
      val pointInTime = OffsetDateTime.parse("2021-11-01T03:59:59Z")

      // when
      val enclosingMonth = ReportingPeriod.enclosingMonth(pointInTime, newJerseyClock)

      // then
      enclosingMonth.periodStart shouldBe OffsetDateTime.parse("2021-10-01T00:00-04:00")
      enclosingMonth.periodEnd shouldBe OffsetDateTime.parse("2021-11-01T00:00-04:00")
    }
  }
}
