package phoenix.wallets.domain

import org.scalatest.matchers.should.Matchers
import org.scalatest.wordspec.AnyWordSpecLike

import phoenix.core.Clock
import phoenix.core.currency.MoneyAmount
import phoenix.punters.domain.LimitPeriod

class DepositHistorySpec extends AnyWordSpecLike with Matchers {

  private val clock = Clock.utcClock

  "DepositHistory" should {

    "calculate total deposits for today" in {
      // given
      var depositHistory = DepositHistory.empty
      val now = clock.currentOffsetDateTime()

      // when
      val depositYesterday = Deposit(MoneyAmount(100), now.minusDays(1))
      val firstDepositToday = Deposit(MoneyAmount(15), now)
      val secondDepositToday = Deposit(MoneyAmount(1000), now)
      depositHistory =
        depositHistory.withDeposit(depositYesterday).withDeposit(firstDepositToday).withDeposit(secondDepositToday)
      val deposits = depositHistory.calculateDeposits(now, clock)

      // then
      val expectedDepositsForToday = firstDepositToday.amount + secondDepositToday.amount
      deposits.daily.value shouldBe expectedDepositsForToday
    }

    "calculate total deposits for this week" in {
      // given
      var depositHistory = DepositHistory.empty
      val now = clock.currentOffsetDateTime()

      // when
      val sometimeLastWeek = LimitPeriod.enclosingWeek(now, clock).startInclusive.minusDays(2)
      val depositLastWeek = Deposit(MoneyAmount(100), sometimeLastWeek)
      val firstDepositThisWeek = Deposit(MoneyAmount(15), now)
      val secondDepositThisWeek = Deposit(MoneyAmount(1000), now)
      depositHistory =
        depositHistory.withDeposit(depositLastWeek).withDeposit(firstDepositThisWeek).withDeposit(secondDepositThisWeek)
      val deposits = depositHistory.calculateDeposits(now, clock)

      // then
      val expectedDepositsForToday = firstDepositThisWeek.amount + secondDepositThisWeek.amount
      deposits.daily.value shouldBe expectedDepositsForToday
    }

    "calculate total deposits for this month" in {
      // given
      var depositHistory = DepositHistory.empty
      val now = clock.currentOffsetDateTime()

      // when
      val sometimeLastMonth = LimitPeriod.enclosingMonth(now, clock).startInclusive.minusDays(2)
      val depositLastMonth = Deposit(MoneyAmount(100), sometimeLastMonth)
      val firstDepositThisMonth = Deposit(MoneyAmount(15), now)
      val secondDepositThisMonth = Deposit(MoneyAmount(1000), now)
      depositHistory = depositHistory
        .withDeposit(depositLastMonth)
        .withDeposit(firstDepositThisMonth)
        .withDeposit(secondDepositThisMonth)
      val deposits = depositHistory.calculateDeposits(now, clock)

      // then
      val expectedDepositsForToday = firstDepositThisMonth.amount + secondDepositThisMonth.amount
      deposits.daily.value shouldBe expectedDepositsForToday
    }
  }
}
