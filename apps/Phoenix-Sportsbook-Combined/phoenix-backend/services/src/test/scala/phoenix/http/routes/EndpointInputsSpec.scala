package phoenix.http.routes

import java.time.OffsetDateTime

import org.scalatest.matchers.should.Matchers
import org.scalatest.wordspec.AnyWordSpecLike

import phoenix.core.Clock
import phoenix.http.routes.EndpointInputs._
import phoenix.time.FakeHardcodedClock

class EndpointInputsSpec extends AnyWordSpecLike with Matchers {

  implicit val clock: Clock = new FakeHardcodedClock

  "Extracting time range" should {
    "provide default time range value (90 day span)" in {
      // when
      val extractionAttempt = timeRangeFilter.extractTimeRangeFilter(sinceOption = None, untilOption = None)

      // then
      extractionAttempt.start shouldBe OffsetDateTime.MIN
      extractionAttempt.end shouldBe clock.currentOffsetDateTime()
    }

    s"provide default value for '${timeRangeFilter.sinceFilter}' given only '${timeRangeFilter.untilFilter}'" in {
      // given
      val monthAgo = clock.currentOffsetDateTime().minusMonths(1)

      // when
      val extractionAttempt =
        timeRangeFilter.extractTimeRangeFilter(sinceOption = None, untilOption = Some(monthAgo))

      // then
      extractionAttempt.start shouldBe OffsetDateTime.MIN
      extractionAttempt.end shouldBe monthAgo
    }

    s"provide default value for '${timeRangeFilter.untilFilter}' given only '${timeRangeFilter.sinceFilter}'" in {
      // given
      val monthAgo = clock.currentOffsetDateTime().minusMonths(1)

      // when
      val extractionAttempt =
        timeRangeFilter.extractTimeRangeFilter(sinceOption = Some(monthAgo), untilOption = None)

      // then
      extractionAttempt.start shouldBe monthAgo
      extractionAttempt.end shouldBe clock.currentOffsetDateTime()
    }

    "properly parse time range" in {
      // given
      val after = clock.currentOffsetDateTime().minusDays(2137)
      val before = clock.currentOffsetDateTime().plusDays(2137)

      // when
      val extractionAttempt =
        timeRangeFilter.extractTimeRangeFilter(sinceOption = Some(after), untilOption = Some(before))

      // then
      extractionAttempt shouldBe TimeRange(after, before)
    }
  }
}
