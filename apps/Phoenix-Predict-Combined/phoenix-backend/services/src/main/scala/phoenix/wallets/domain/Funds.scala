package phoenix.wallets.domain

import phoenix.core.currency.DefaultCurrencyMoney
import phoenix.core.currency.MoneyAmount
import phoenix.core.currency.Zero

sealed trait Funds {
  def value: DefaultCurrencyMoney
}

object Funds {
  case class RealMoney(value: DefaultCurrencyMoney) extends Funds {
    def +(other: RealMoney): RealMoney = RealMoney(this.value + other.value)
    def -(other: RealMoney): RealMoney = RealMoney(this.value - other.value)
    def negate: RealMoney = RealMoney(-this.value)

    def moneyAmount: MoneyAmount = MoneyAmount(value.amount)
  }

  object RealMoney {
    def apply(money: MoneyAmount): RealMoney =
      RealMoney(DefaultCurrencyMoney(money))

    def apply(money: BigDecimal): RealMoney =
      apply(MoneyAmount(money))

    implicit val zero: Zero[RealMoney] = Zero.instance(RealMoney(MoneyAmount.zero.get))
    implicit val ordering: Ordering[RealMoney] = Ordering.by(_.value.moneyAmount)
  }

  case class BonusFunds(value: DefaultCurrencyMoney) extends Funds {
    def +(other: BonusFunds): BonusFunds = BonusFunds(this.value + other.value)
  }

}
