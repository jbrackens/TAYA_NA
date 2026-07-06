package phoenix

import java.time.DayOfWeek
import java.time.OffsetDateTime
import java.time.temporal.TemporalAdjusters

import org.scalatest.Inspectors
import org.scalatest.concurrent.ScalaFutures
import org.scalatest.matchers.should.Matchers
import org.scalatest.wordspec.AnyWordSpecLike

class PunterContractTest
    extends UniqueTestUsers
    with AnyWordSpecLike
    with Matchers
    with Inspectors
    with ScalaFutures
    with PunterRequests
    with WebSocketSupport {

  "punter" should {
    "be able to set all deposit limits at once with increase and decrease simultaneously" in withUniqueTestUser {
      testUser =>
        val (oldDepositLimit, newDepositLimit) = await(for {
          response <- signIn(testUser.credentials)
          accessToken = response.token
          depositLimit <- setDepositLimits(LimitRequest(100, 200, 300), accessToken.token)
          newDepositLimit <- setDepositLimits(LimitRequest(99, 201, 300), accessToken.token)
        } yield (depositLimit, newDepositLimit))

        newDepositLimit.daily.current.limit shouldBe 99
        newDepositLimit.daily.next shouldBe None

        newDepositLimit.weekly.current.limit shouldBe 200
        newDepositLimit.weekly.next.get.limit shouldBe 201

        newDepositLimit.monthly.current.limit shouldBe oldDepositLimit.monthly.current.limit
        newDepositLimit.monthly.next shouldBe None
    }

    "be able to raise deposit limits" in withUniqueTestUser { testUser =>
      val (oldDepositLimit, newDepositLimit) = await(for {
        response <- signIn(testUser.credentials)
        accessToken = response.token
        depositLimit <- setDepositLimits(LimitRequest(100, 200, 300), accessToken.token)
        newDepositLimit <- setDepositLimits(LimitRequest(101, 201, 301), accessToken.token)
      } yield (depositLimit, newDepositLimit))

      newDepositLimit.daily.current.limit shouldBe 100
      newDepositLimit.daily.next.get.limit shouldBe 101

      newDepositLimit.weekly.current.limit shouldBe 200
      newDepositLimit.weekly.next.get.limit shouldBe 201

      newDepositLimit.monthly.current.limit shouldBe 300
      newDepositLimit.monthly.next.get.limit shouldBe 301

      testDatesInSinceAreCorrect(newDepositLimit, oldDepositLimit)

    }

    "be able to lower deposit limits" in withUniqueTestUser { testUser =>
      val newDepositLimit = await(for {
        response <- signIn(testUser.credentials)
        accessToken = response.token
        _ <- setDepositLimits(LimitRequest(100, 200, 300), accessToken.token)
        newDepositLimit <- setDepositLimits(LimitRequest(99, 199, 299), accessToken.token)
      } yield newDepositLimit)
      newDepositLimit.daily.current.limit shouldBe 99
      newDepositLimit.daily.next shouldBe None
      newDepositLimit.weekly.current.limit shouldBe 199
      newDepositLimit.weekly.next shouldBe None
      newDepositLimit.monthly.current.limit shouldBe 299
      newDepositLimit.monthly.next shouldBe None
    }

    "be able to set all stake limits at once with increase and decrease simultaneously" in withUniqueTestUser {
      testUser =>
        val (oldStakeLimit, newStakeLimit) = await(for {
          response <- signIn(testUser.credentials)
          accessToken = response.token
          stakeLimit <- setStakeLimits(LimitRequest(100, 200, 300), accessToken.token)
          newStakeLimit <- setStakeLimits(LimitRequest(99, 201, 300), accessToken.token)
        } yield (stakeLimit, newStakeLimit))

        newStakeLimit.daily.current.limit shouldBe 99
        newStakeLimit.daily.next shouldBe None

        newStakeLimit.weekly.current.limit shouldBe 200
        newStakeLimit.weekly.next.get.limit shouldBe 201

        newStakeLimit.monthly.current.limit shouldBe oldStakeLimit.monthly.current.limit
        newStakeLimit.monthly.next shouldBe None
    }

    "be able to raise stake limits" in withUniqueTestUser { testUser =>
      val (oldStakeLimit, newStakeLimit) = await(for {
        response <- signIn(testUser.credentials)
        accessToken = response.token
        stakeLimit <- setStakeLimits(LimitRequest(100, 200, 300), accessToken.token)
        newStakeLimit <- setStakeLimits(LimitRequest(101, 201, 301), accessToken.token)
      } yield (stakeLimit, newStakeLimit))

      newStakeLimit.daily.current.limit shouldBe 100
      newStakeLimit.daily.next.get.limit shouldBe 101

      newStakeLimit.weekly.current.limit shouldBe 200
      newStakeLimit.weekly.next.get.limit shouldBe 201

      newStakeLimit.monthly.current.limit shouldBe 300
      newStakeLimit.monthly.next.get.limit shouldBe 301

      testDatesInSinceAreCorrect(newStakeLimit, oldStakeLimit)

    }

    "be able to lower stake limits" in withUniqueTestUser { testUser =>
      val newStakeLimit = await(for {
        response <- signIn(testUser.credentials)
        accessToken = response.token
        _ <- setStakeLimits(LimitRequest(100, 200, 300), accessToken.token)
        newStakeLimit <- setStakeLimits(LimitRequest(99, 199, 299), accessToken.token)
      } yield newStakeLimit)
      newStakeLimit.daily.current.limit shouldBe 99
      newStakeLimit.daily.next shouldBe None
      newStakeLimit.weekly.current.limit shouldBe 199
      newStakeLimit.weekly.next shouldBe None
      newStakeLimit.monthly.current.limit shouldBe 299
      newStakeLimit.monthly.next shouldBe None
    }
  }

  def testDatesInSinceAreCorrect(newDepositLimit: PunterLimitResponse, oldDepositLimit: PunterLimitResponse): Unit = {
    val nextDaily = newDepositLimit.daily.next.get.since
    val oldDailyAdjusted = oldDepositLimit.daily.current.since.plusDays(1)
    val nextWeekly = newDepositLimit.weekly.next.get.since
    val oldWeeklyAdjusted = oldDepositLimit.weekly.current.since.`with`(TemporalAdjusters.next(DayOfWeek.MONDAY))
    val nextMonthly = newDepositLimit.monthly.next.get.since
    val oldMonthlyAdjusted =
      oldDepositLimit.monthly.current.since.plusMonths(1).`with`(TemporalAdjusters.firstDayOfMonth())

    shouldBeSameDay(nextDaily, oldDailyAdjusted)

    shouldBeSameDay(nextWeekly, oldWeeklyAdjusted)

    shouldBeSameDay(nextMonthly, oldMonthlyAdjusted)
  }

  def shouldBeSameDay(nextPeriod: OffsetDateTime, oldPeriodAdjusted: OffsetDateTime): Unit = {
    nextPeriod.getDayOfMonth shouldBe oldPeriodAdjusted.getDayOfMonth
    nextPeriod.getMonth shouldBe oldPeriodAdjusted.getMonth
    nextPeriod.getYear shouldBe oldPeriodAdjusted.getYear
  }
}
