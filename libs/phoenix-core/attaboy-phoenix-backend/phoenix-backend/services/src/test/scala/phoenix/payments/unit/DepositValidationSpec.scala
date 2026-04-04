package phoenix.payments.unit

import org.scalatest.matchers.should.Matchers
import org.scalatest.wordspec.AnyWordSpecLike

import phoenix.core.Clock
import phoenix.core.currency.MoneyAmount
import phoenix.payments.domain.DepositValidation
import phoenix.punters.PunterDataGenerator.createDepositLimitAmount
import phoenix.punters.domain.Limit.Daily
import phoenix.punters.domain.Limit.Monthly
import phoenix.punters.domain.Limit.Weekly
import phoenix.punters.domain.Limits
import phoenix.punters.support.LimitHelpers._
import phoenix.wallets.domain.Deposit
import phoenix.wallets.domain.DepositHistory

final class DepositValidationSpec extends AnyWordSpecLike with Matchers {

  private val clock = Clock.utcClock

  "AuthorizeDeposit" should {

    "return false when a deposit would exceed daily limit" in {
      // given
      val limits =
        Limits.unsafe(Daily(Some(createDepositLimitAmount(10))), Weekly(value = None), Monthly(value = None))
      val effectiveLimits = limitsToAlwaysEffectivePeriodicLimits(limits)
      val history = DepositHistory.empty
        .withDeposit(Deposit(MoneyAmount(10), clock.currentOffsetDateTime()))
        .calculateDeposits(clock.currentOffsetDateTime(), clock)
      val amount = MoneyAmount(1)

      // when
      val canDeposit = DepositValidation.validate(amount, history, effectiveLimits)

      // then
      canDeposit shouldBe false
    }

    "return true when a deposit would not exceed daily limit" in {
      // given
      val limits =
        Limits.unsafe(Daily(Some(createDepositLimitAmount(100))), Weekly(value = None), Monthly(value = None))
      val effectiveLimits = limitsToAlwaysEffectivePeriodicLimits(limits)
      val history = DepositHistory.empty
        .withDeposit(Deposit(MoneyAmount(99), clock.currentOffsetDateTime()))
        .calculateDeposits(clock.currentOffsetDateTime(), clock)
      val amount = MoneyAmount(1)

      // when
      val canDeposit = DepositValidation.validate(amount, history, effectiveLimits)

      // then
      canDeposit shouldBe true
    }

    "return false when a deposit would exceed weekly limit" in {
      // given
      val limits =
        Limits.unsafe(Daily(value = None), Weekly(Some(createDepositLimitAmount(10))), Monthly(value = None))
      val effectiveLimits = limitsToAlwaysEffectivePeriodicLimits(limits)
      val history = DepositHistory.empty
        .withDeposit(Deposit(MoneyAmount(10), clock.currentOffsetDateTime()))
        .calculateDeposits(clock.currentOffsetDateTime(), clock)
      val amount = MoneyAmount(1)

      // when
      val canDeposit = DepositValidation.validate(amount, history, effectiveLimits)

      // then
      canDeposit shouldBe false
    }

    "return true when a deposit would not exceed weekly limit" in {
      // given
      val limits =
        Limits.unsafe(Daily(value = None), Weekly(Some(createDepositLimitAmount(100))), Monthly(value = None))
      val effectiveLimits = limitsToAlwaysEffectivePeriodicLimits(limits)
      val history = DepositHistory.empty
        .withDeposit(Deposit(MoneyAmount(99), clock.currentOffsetDateTime()))
        .calculateDeposits(clock.currentOffsetDateTime(), clock)
      val amount = MoneyAmount(1)

      // when
      val canDeposit = DepositValidation.validate(amount, history, effectiveLimits)

      // then
      canDeposit shouldBe true
    }

    "return false when a deposit would exceed monthly limit" in {
      // given
      val limits =
        Limits.unsafe(Daily(value = None), Weekly(value = None), Monthly(Some(createDepositLimitAmount(10))))
      val effectiveLimits = limitsToAlwaysEffectivePeriodicLimits(limits)
      val history = DepositHistory.empty
        .withDeposit(Deposit(MoneyAmount(10), clock.currentOffsetDateTime()))
        .calculateDeposits(clock.currentOffsetDateTime(), clock)
      val amount = MoneyAmount(1)

      // when
      val canDeposit = DepositValidation.validate(amount, history, effectiveLimits)

      // then
      canDeposit shouldBe false
    }

    "return true when a deposit would not exceed monthly limit" in {
      // given
      val limits =
        Limits.unsafe(Daily(value = None), Weekly(value = None), Monthly(Some(createDepositLimitAmount(100))))
      val effectiveLimits = limitsToAlwaysEffectivePeriodicLimits(limits)
      val history = DepositHistory.empty
        .withDeposit(Deposit(MoneyAmount(99), clock.currentOffsetDateTime()))
        .calculateDeposits(clock.currentOffsetDateTime(), clock)
      val amount = MoneyAmount(1)

      // when
      val canDeposit = DepositValidation.validate(amount, history, effectiveLimits)

      // then
      canDeposit shouldBe true
    }
  }
}
