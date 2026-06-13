package phoenix.core.scheduler

import java.time.DayOfWeek

import scala.concurrent.duration._

import org.scalatest.matchers.should.Matchers
import org.scalatest.wordspec.AnyWordSpecLike
import pureconfig.ConfigSource

import phoenix.core.TimeUtils.TimeOfADay
import phoenix.core.scheduler.ExecutionSchedule.Daily
import phoenix.core.scheduler.ExecutionSchedule.Monthly
import phoenix.core.scheduler.ExecutionSchedule.Recurring
import phoenix.core.scheduler.ExecutionSchedule.Weekly

final class ScheduledJobConfigParsingSpec extends AnyWordSpecLike with Matchers {

  import ConfigCodecs._

  "should properly parse config for recurring execution" in {
    // given
    val configString =
      """
        |name = "Recurring Schedule"
        |schedule = "mode=recurring,every=37.minutes"
        |time-restriction = 1.second
        |max-retries = 2""".stripMargin

    // when
    val parsingResult = ConfigSource.string(configString).load[ScheduledJobConfig]

    // then
    parsingResult shouldBe Right(
      ScheduledJobConfig(
        name = "Recurring Schedule",
        schedule = Recurring(every = 37.minutes),
        timeRestriction = 1.second,
        maxRetries = 2))
  }

  "should properly parse config for daily execution" in {
    // given
    val configString =
      """
        |name = "Daily Schedule"
        |schedule = "mode=daily,start-time=\"04:00\""
        |time-restriction = 1.second
        |max-retries = 2""".stripMargin

    // when
    val parsingResult = ConfigSource.string(configString).load[ScheduledJobConfig]

    // then
    parsingResult shouldBe Right(
      ScheduledJobConfig(
        name = "Daily Schedule",
        schedule = Daily(startTime = TimeOfADay.of(4, 0)),
        timeRestriction = 1.second,
        maxRetries = 2))
  }

  "should properly parse config for weekly execution" in {
    // given
    val configString =
      """
        |name = "Weekly Schedule"
        |schedule = "mode=weekly,day-of-week=SATURDAY,start-time=\"21:37\""
        |time-restriction = 1.second
        |max-retries = 2""".stripMargin

    // when
    val parsingResult = ConfigSource.string(configString).load[ScheduledJobConfig]

    // then
    parsingResult shouldBe Right(
      ScheduledJobConfig(
        name = "Weekly Schedule",
        schedule = Weekly(dayOfWeek = DayOfWeek.SATURDAY, startTime = TimeOfADay.of(21, 37)),
        timeRestriction = 1.second,
        maxRetries = 2))
  }

  "should properly parse config for monthly execution" in {
    // given
    val configString =
      """
        |name = "Monthly Schedule"
        |schedule = "mode=monthly,day-of-month=2,start-time=\"21:37\""
        |time-restriction = 1.second
        |max-retries = 2""".stripMargin

    // when
    val parsingResult = ConfigSource.string(configString).load[ScheduledJobConfig]

    // then
    parsingResult shouldBe Right(
      ScheduledJobConfig(
        name = "Monthly Schedule",
        schedule = Monthly(dayOfMonth = 2, startTime = TimeOfADay.of(21, 37)),
        timeRestriction = 1.second,
        maxRetries = 2))
  }
}
