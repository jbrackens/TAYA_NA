package phoenix.payments.domain

import phoenix.core.currency.MoneyAmount
import phoenix.punters.domain.CurrentAndNextLimits
import phoenix.punters.domain.DepositLimitAmount
import phoenix.punters.domain.Limit
import phoenix.wallets.domain.Deposits

object DepositValidation {

  def validate(amount: MoneyAmount, history: Deposits, limits: CurrentAndNextLimits[DepositLimitAmount]): Boolean =
    canDeposit(limits.daily.current.limit, history.daily.value + amount) &&
    canDeposit(limits.weekly.current.limit, history.weekly.value + amount) &&
    canDeposit(limits.monthly.current.limit, history.monthly.value + amount)

  private def canDeposit(limit: Limit[DepositLimitAmount, _], amountIfOperationWouldBeApplied: MoneyAmount): Boolean =
    limit.value match {
      case Some(definedLimit) => amountIfOperationWouldBeApplied.amount <= definedLimit.value.amount
      case None               => true
    }
}
