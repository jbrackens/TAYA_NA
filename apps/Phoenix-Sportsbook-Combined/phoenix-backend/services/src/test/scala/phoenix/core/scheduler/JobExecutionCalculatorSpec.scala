package phoenix.core.scheduler

import java.time.DayOfWeek
import java.time.OffsetDateTime

import scala.concurrent.duration._

import org.scalatest.matchers.should.Matchers
import org.scalatest.wordspec.AnyWordSpecLike

import phoenix.core.TimeUtils.TimeOfADay
import phoenix.core.scheduler.ExecutionSchedule.Daily
import phoenix.core.scheduler.ExecutionSchedule.Monthly
import phoenix.core.scheduler.ExecutionSchedule.Recurring
import phoenix.core.scheduler.ExecutionSchedule.Weekly

final class JobExecutionCalculatorSpec extends AnyWordSpecLike with Matchers {

  "when handling recurrent jobs" should {
    "should execute them immediately" in {
      // given
      val now = OffsetDateTime.parse("2021-12-29T16:00Z")
      val recurringSchedule = Recurring(every = 10.minutes)
      val expectedFirstExecution = now

      // when
      val jobExecution = JobExecutionCalculator.calculateExecution(asOf = now, recurringSchedule)

      // then
      jobExecution.firstExecution shouldBe expectedFirstExecution
      jobExecution.initialDelay shouldBe Duration.Zero
      jobExecution.subsequentExecutionsInterval shouldBe 10.minutes

      // and
      jobExecution.shouldExecuteAt(expectedFirstExecution) shouldBe true
    }
  }

  "when handling daily jobs" should {
    "should execute them same day if execution time not elapsed yet" in {
      // given
      val now = OffsetDateTime.parse("2021-12-29T16:00Z")
      val dailySchedule = Daily(startTime = TimeOfADay.of(18, 0))
      val expectedFirstExecution = now.plusHours(2)

      // when
      val jobExecution = JobExecutionCalculator.calculateExecution(asOf = now, dailySchedule)

      // then
      jobExecution.firstExecution shouldBe expectedFirstExecution
      jobExecution.initialDelay shouldBe 2.hours
      jobExecution.subsequentExecutionsInterval shouldBe 1.day

      // and
      jobExecution.shouldExecuteAt(expectedFirstExecution) shouldBe true
    }

    "should execute them next day if execution time already reached" in {
      // given
      val now = OffsetDateTime.parse("2021-12-29T18:00Z")
      val dailySchedule = Daily(startTime = TimeOfADay.of(16, 0))
      val expectedFirstExecution = OffsetDateTime.parse("2021-12-30T16:00Z")

      // when
      val jobExecution = JobExecutionCalculator.calculateExecution(asOf = now, dailySchedule)

      // then
      jobExecution.firstExecution shouldBe expectedFirstExecution
      jobExecution.initialDelay shouldBe 22.hours
      jobExecution.subsequentExecutionsInterval shouldBe 1.day

      // and
      jobExecution.shouldExecuteAt(expectedFirstExecution) shouldBe true
    }
  }

  "when handling weekly jobs" should {
    "should execute them same week if execution time not elapsed yet" in {
      // given
      val now = OffsetDateTime.parse("2021-12-29T16:00Z")
      val weeklySchedule = Weekly(dayOfWeek = DayOfWeek.WEDNESDAY, startTime = TimeOfADay.of(18, 0))
      val expectedFirstExecution = now.plusHours(2)

      // when
      val jobExecution = JobExecutionCalculator.calculateExecution(asOf = now, weeklySchedule)

      // then
      jobExecution.firstExecution shouldBe expectedFirstExecution
      jobExecution.initialDelay shouldBe 2.hours
      jobExecution.subsequentExecutionsInterval shouldBe 7.days

      // and
      jobExecution.shouldExecuteAt(expectedFirstExecution) shouldBe true
      jobExecution.shouldExecuteAt(expectedFirstExecution.plusDays(1)) shouldBe false
      jobExecution.shouldExecuteAt(expectedFirstExecution.plusWeeks(1)) shouldBe true
    }

    "should execute them next week if execution time already reached" in {
      // given
      val now = OffsetDateTime.parse("2021-12-29T18:00Z")
      val weeklySchedule = Weekly(dayOfWeek = DayOfWeek.WEDNESDAY, startTime = TimeOfADay.of(16, 0))
      val expectedFirstExecution = OffsetDateTime.parse("2022-01-05T16:00Z")

      // when
      val jobExecution = JobExecutionCalculator.calculateExecution(asOf = now, weeklySchedule)

      // then
      jobExecution.firstExecution shouldBe expectedFirstExecution
      jobExecution.initialDelay shouldBe 166.hours
      jobExecution.subsequentExecutionsInterval shouldBe 7.days

      // and
      jobExecution.shouldExecuteAt(expectedFirstExecution) shouldBe true
      jobExecution.shouldExecuteAt(expectedFirstExecution.plusDays(1)) shouldBe false
      jobExecution.shouldExecuteAt(expectedFirstExecution.plusWeeks(1)) shouldBe true
    }
  }

  "when handling monthly jobs" should {
    "should execute them same month if execution time not elapsed yet" in {
      // given
      val now = OffsetDateTime.parse("2021-12-10T16:00Z")
      val monthlySchedule = Monthly(dayOfMonth = 10, startTime = TimeOfADay.of(18, 0))
      val expectedFirstExecution = now.plusHours(2)

      // when
      val jobExecution = JobExecutionCalculator.calculateExecution(asOf = now, monthlySchedule)

      // then
      jobExecution.firstExecution shouldBe expectedFirstExecution
      jobExecution.initialDelay shouldBe 2.hours
      // we evaluate monthly jobs every day because it's not fixed interval
      jobExecution.subsequentExecutionsInterval shouldBe 1.day

      // and
      jobExecution.shouldExecuteAt(expectedFirstExecution) shouldBe true
      jobExecution.shouldExecuteAt(expectedFirstExecution.plusDays(1)) shouldBe false
      jobExecution.shouldExecuteAt(expectedFirstExecution.plusMonths(1)) shouldBe true
    }

    "should execute them next month if execution time already reached" in {
      // given
      val now = OffsetDateTime.parse("2021-12-10T18:00Z")
      val monthlySchedule = Monthly(dayOfMonth = 10, startTime = TimeOfADay.of(16, 0))
      val expectedFirstExecution = OffsetDateTime.parse("2022-01-10T16:00Z")

      // when
      val jobExecution = JobExecutionCalculator.calculateExecution(asOf = now, monthlySchedule)

      // then
      jobExecution.firstExecution shouldBe expectedFirstExecution
      jobExecution.initialDelay shouldBe 742.hours
      // we evaluate monthly jobs every day because it's not fixed interval
      jobExecution.subsequentExecutionsInterval shouldBe 1.day

      // and
      jobExecution.shouldExecuteAt(expectedFirstExecution) shouldBe true
      jobExecution.shouldExecuteAt(expectedFirstExecution.plusDays(1)) shouldBe false
      jobExecution.shouldExecuteAt(expectedFirstExecution.plusMonths(1)) shouldBe true
    }
  }
}
