package phoenix.core

import phoenix.bets.Stake
import phoenix.core.currency.MoneyAmount
import phoenix.core.odds.Odds
import phoenix.wallets.domain.Funds.RealMoney

object PotentialReturn {
  def apply(stake: Stake, odds: Odds): MoneyAmount =
    MoneyAmount((stake.value * odds).amount)

  def apply(stake: MoneyAmount, odds: Odds): MoneyAmount =
    MoneyAmount(stake.amount * odds.value)

  def apply(stake: RealMoney, odds: Odds): RealMoney =
    stake.copy(value = stake.value * odds)
}
