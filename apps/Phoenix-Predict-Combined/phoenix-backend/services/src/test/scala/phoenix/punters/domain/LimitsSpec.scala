package phoenix.punters.domain

import java.time.Month.FEBRUARY
import java.time.Month.MARCH

import org.scalatest.matchers.should.Matchers
import org.scalatest.wordspec.AnyWordSpecLike

import phoenix.core.Clock
import phoenix.core.currency.MoneyAmount
import phoenix.core.deployment.DeploymentClock
import phoenix.punters.domain.Limit.Daily
import phoenix.punters.domain.Limit.Monthly
import phoenix.punters.domain.Limit.Weekly
import phoenix.shared.support.TimeSupport.deploymentConfig
import phoenix.shared.support.TimeSupport.deploymentTime

final class LimitsSpec extends AnyWordSpecLike with Matchers {

  val clock: Clock = DeploymentClock.fromConfig(deploymentConfig)

  "Limits should" should {

    "return current limits" in {
      // given
      val depositLimits = Limits.unsafe(
        Daily(Some(DepositLimitAmount(MoneyAmount(3)))),
        Weekly(Some(DepositLimitAmount(MoneyAmount(10)))),
        Monthly(Some(DepositLimitAmount(MoneyAmount(30)))))
      val sessions = LimitsLog.withLimits(depositLimits)

      // when
      val anyDate = deploymentTime(2018, FEBRUARY, 2, 19, 15)
      val limits = sessions.periodicLimits(asOf = anyDate, clock)

      // then
      limits.daily.current.limit shouldBe depositLimits.daily
      limits.weekly.current.limit shouldBe depositLimits.weekly
      limits.monthly.current.limit shouldBe depositLimits.monthly
    }

    "decrease deposit limits immediately" in {
      // given
      val depositLimits = Limits.unsafe(
        Daily(Some(DepositLimitAmount(MoneyAmount(3)))),
        Weekly(Some(DepositLimitAmount(MoneyAmount(10)))),
        Monthly(Some(DepositLimitAmount(MoneyAmount(30)))))
      var deposits = LimitsLog.withLimits(depositLimits)

      // when
      val wednesday = deploymentTime(2021, FEBRUARY, 24, 21, 37)
      val decreasedWeeklyLimit = Weekly(Some(DepositLimitAmount(MoneyAmount(5))))
      val limitChange =
        deposits.estimateLimitsChange(depositLimits.copy(weekly = decreasedWeeklyLimit), asOf = wednesday, clock)
      deposits = deposits.changeLimits(limitChange)

      // then
      val previousWeek = wednesday.minusDays(3)
      val lastWeekLimits = deposits.periodicLimits(asOf = previousWeek, clock)
      lastWeekLimits.weekly.current.limit shouldBe depositLimits.weekly
      lastWeekLimits.weekly.next.map(_.limit) shouldBe Some(decreasedWeeklyLimit)

      // and
      val thisWeek = wednesday.plusDays(2)
      val thisWeekLimits = deposits.periodicLimits(asOf = thisWeek, clock)
      thisWeekLimits.weekly.current.limit shouldBe decreasedWeeklyLimit
      thisWeekLimits.weekly.next shouldBe None

      // and
      val nextWeek = wednesday.plusDays(5)
      val nextWeekLimits = deposits.periodicLimits(asOf = nextWeek, clock)
      nextWeekLimits.weekly.current.limit shouldBe decreasedWeeklyLimit
      nextWeekLimits.weekly.next shouldBe None
    }

    "decrease deposit limits immediately when there's no limits" in {
      // given
      val depositLimits: Limits[DepositLimitAmount] = Limits.unsafe(Daily(None), Weekly(None), Monthly(None))
      var deposits = LimitsLog.withLimits(depositLimits)

      // when
      val limitChangeDate = deploymentTime(2021, FEBRUARY, 24, 21, 37)
      val decreasedLimits = Limits.unsafe(
        Daily(Some(DepositLimitAmount(MoneyAmount(3)))),
        Weekly(Some(DepositLimitAmount(MoneyAmount(10)))),
        Monthly(Some(DepositLimitAmount(MoneyAmount(30)))))
      val limitChange =
        deposits.estimateLimitsChange(decreasedLimits, asOf = limitChangeDate, clock)
      deposits = deposits.changeLimits(limitChange)

      // then
      val currentLimits = deposits.limits(asOf = limitChangeDate, clock)
      currentLimits.daily shouldBe decreasedLimits.daily
      currentLimits.weekly shouldBe decreasedLimits.weekly
      currentLimits.monthly shouldBe decreasedLimits.monthly
    }

    "increase limits only as of next limit period" in {
      // given
      val depositLimits = Limits.unsafe(
        Daily(Some(DepositLimitAmount(MoneyAmount(3)))),
        Weekly(Some(DepositLimitAmount(MoneyAmount(10)))),
        Monthly(Some(DepositLimitAmount(MoneyAmount(30)))))
      var sessions = LimitsLog.withLimits(depositLimits)

      // when
      val february = deploymentTime(2021, FEBRUARY, 2, 21, 37)
      val increasedMonthlyLimit = Monthly(Some(DepositLimitAmount(MoneyAmount(31))))
      val limitChange =
        sessions.estimateLimitsChange(depositLimits.copy(monthly = increasedMonthlyLimit), asOf = february, clock)
      sessions = sessions.changeLimits(limitChange)

      // then
      val previousMonth = february.minusMonths(1)
      val limitsPreviousMonth = sessions.periodicLimits(asOf = previousMonth, clock)
      limitsPreviousMonth.monthly.current.limit shouldBe depositLimits.monthly
      limitsPreviousMonth.monthly.next shouldBe None

      // and
      val thisMonth = february.plusDays(7)
      val limitsThisMonth = sessions.periodicLimits(asOf = thisMonth, clock)
      limitsThisMonth.monthly.current.limit shouldBe depositLimits.monthly
      limitsThisMonth.monthly.next.map(_.limit) shouldBe Some(increasedMonthlyLimit)

      // and
      val nextMonth = february.plusMonths(1)
      val limitsNextMonth = sessions.periodicLimits(asOf = nextMonth, clock)
      limitsNextMonth.monthly.current.limit shouldBe increasedMonthlyLimit
      limitsNextMonth.monthly.next shouldBe None
    }

    "set 'no limit' only as of next period" in {
      // given
      val depositLimits = Limits.unsafe(
        Daily(Some(DepositLimitAmount(MoneyAmount(10)))),
        Weekly(Some(DepositLimitAmount(MoneyAmount(20)))),
        Monthly(Some(DepositLimitAmount(MoneyAmount(30)))))
      val sessions = LimitsLog.withLimits(depositLimits)

      // when
      val noLimits: Limits[DepositLimitAmount] = Limits.unsafe(Daily(None), Weekly(None), Monthly(None))
      val dayOfChange = deploymentTime(2021, FEBRUARY, 2, 21, 37)
      val effectiveLimits = sessions.estimateLimitsChange(noLimits, asOf = dayOfChange, clock)

      // then
      val nextDay = deploymentTime(2021, FEBRUARY, 3, 0, 0)
      effectiveLimits.daily.since shouldBe nextDay

      val nextWeek = deploymentTime(2021, FEBRUARY, 8, 0, 0)
      effectiveLimits.weekly.since shouldBe nextWeek

      val nextMonth = deploymentTime(2021, MARCH, 1, 0, 0)
      effectiveLimits.monthly.since shouldBe nextMonth
    }
  }
}
