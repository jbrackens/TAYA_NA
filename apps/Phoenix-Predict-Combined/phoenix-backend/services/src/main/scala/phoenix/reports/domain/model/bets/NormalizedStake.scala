package phoenix.reports.domain.model.bets

import phoenix.bets.Stake
import phoenix.core.currency.MoneyAmount

private[reports] final case class NormalizedStake(value: MoneyAmount)

private[reports] object NormalizedStake {
  def from(stake: Stake): NormalizedStake = new NormalizedStake(MoneyAmount(stake.value.amount))
}
