package phoenix.punters.unit

import scala.concurrent.duration.DurationInt

import cats.data.Validated.Valid
import org.scalatest.matchers.should.Matchers
import org.scalatest.wordspec.AnyWordSpecLike

import phoenix.punters.domain.SessionDuration
import phoenix.punters.domain.SessionLimits

final class SessionLimitsValidationSpec extends AnyWordSpecLike with Matchers {

  "Daily session limit" should {
    "be greater than 0" in {
      // when
      val attempt = SessionLimits.Daily(Some(SessionDuration(0.seconds)))

      // then
      attempt.isInvalid shouldBe true
    }

    "not be greater than 24h" in {
      // when
      val attempt = SessionLimits.Daily(Some(SessionDuration(24.hours) + SessionDuration(1.nano)))

      // then
      attempt.isInvalid shouldBe true
    }

    "be properly created otherwise" in {
      // given
      val duration = SessionDuration(1.hour)

      // when
      val attempt = SessionLimits.Daily(Some(duration))

      // then
      attempt.map(_.value) shouldBe Valid(Some(duration))
    }
  }

  "Weekly session limit" should {
    "be greater than 0" in {
      // when
      val attempt = SessionLimits.Weekly(Some(SessionDuration(0.seconds)))

      // then
      attempt.isInvalid shouldBe true
    }

    "not be greater than 7d" in {
      // when
      val attempt = SessionLimits.Weekly(Some(SessionDuration(7.days) + SessionDuration(1.nano)))

      // then
      attempt.isInvalid shouldBe true
    }

    "be properly created otherwise" in {
      // given
      val duration = SessionDuration(3.days)

      // when
      val attempt = SessionLimits.Weekly(Some(duration))

      // then
      attempt.map(_.value) shouldBe Valid(Some(duration))
    }
  }

  "Monthly session limit" should {
    "be greater than 0" in {
      // when
      val attempt = SessionLimits.Monthly(Some(SessionDuration(0.seconds)))

      // then
      attempt.isInvalid shouldBe true
    }

    "not be greater than 31d" in {
      // when
      val attempt = SessionLimits.Monthly(Some(SessionDuration(31.days) + SessionDuration(1.nano)))

      // then
      attempt.isInvalid shouldBe true
    }

    "be properly created otherwise" in {
      // given
      val duration = SessionDuration(30.days)

      // when
      val attempt = SessionLimits.Monthly(Some(duration))

      // then
      attempt.map(_.value) shouldBe Valid(Some(duration))
    }
  }
}
