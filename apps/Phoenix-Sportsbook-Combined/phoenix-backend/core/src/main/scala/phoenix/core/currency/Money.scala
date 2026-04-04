package phoenix.core.currency

import scala.math.BigDecimal.RoundingMode

import cats.kernel.Monoid

import phoenix.core.odds.Odds

/**
 * Represents money denominated in an arbitrary currency, which might or might not be the default currency of the given deployment/brand.
 * Should be used whenever the currency is uncertain - esp. for the customer money coming from the top-ups.
 *
 * See [[MoneyAmount]].
 */
abstract sealed class AnyCurrencyMoney extends Product {
  val amount: Amount
  val currency: AnyCurrency

  override final def equals(other: Any): Boolean = {
    other match {
      case m: AnyCurrencyMoney => this.amount == m.amount && this.currency == m.currency
      case _                   => false
    }
  }

  override final def hashCode(): Int = scala.util.hashing.MurmurHash3.orderedHash(Seq(amount, currency))

  override final def toString: String = s"$amount $currency"

  override def productArity: Int = 2

  override def productElement(n: Int): Any = {
    n match {
      case 0 => amount
      case 1 => currency
      case _ => throw new IndexOutOfBoundsException(n)
    }
  }

  override def canEqual(that: Any): Boolean = that.isInstanceOf[AnyCurrencyMoney]
}

object AnyCurrencyMoney {
  def unapply(arg: AnyCurrencyMoney): Some[(Amount, AnyCurrency)] = Some((arg.amount, arg.currency))
}

/**
 * Represents money denominated in the default currency of the given deployment/brand.
 * Note that it's only in this class (and not in its superclass, [[AnyCurrencyMoney]])
 * where the operations like addition and subtraction are defined.
 * This is basically using type system to enforce that money is normalized
 * to the default currency before any processing.
 *
 * See [[MoneyAmount]].
 */
final case class DefaultCurrencyMoney(override val amount: Amount, override val currency: DefaultCurrency)
    extends AnyCurrencyMoney
    with Ordered[DefaultCurrencyMoney] {
  def +(amount: DefaultCurrencyMoney): DefaultCurrencyMoney = performOperation(amount) { _ + _ }

  def -(amount: DefaultCurrencyMoney): DefaultCurrencyMoney = performOperation(amount) { _ - _ }

  def *(odds: Odds): DefaultCurrencyMoney = copy(amount * odds.value)

  def unary_- : DefaultCurrencyMoney = copy(amount = -amount)

  private def performOperation(other: DefaultCurrencyMoney)(
      operation: (Amount, Amount) => Amount): DefaultCurrencyMoney = {
    DefaultCurrencyMoney(operation(this.amount, other.amount), currency)
  }

  def copy(amount: Amount): DefaultCurrencyMoney = DefaultCurrencyMoney(amount, currency)

  override def compare(that: DefaultCurrencyMoney): Int = amount.compare(that.amount)

  def moneyAmount: MoneyAmount = MoneyAmount(amount)
}

object DefaultCurrencyMoney {
  def apply(amount: MoneyAmount): DefaultCurrencyMoney =
    new DefaultCurrencyMoney(amount.amount, DefaultCurrency)

  def apply(amount: Amount): DefaultCurrencyMoney =
    apply(MoneyAmount(amount))

  def apply(amount: Amount, currency: DefaultCurrency): DefaultCurrencyMoney =
    new DefaultCurrencyMoney(MoneyAmount(amount).amount, currency)

  def unapply(arg: DefaultCurrencyMoney): Some[(Amount, DefaultCurrency)] = Some((arg.amount, arg.currency))

  def formatMoneyAmount(amount: MoneyAmount): String = {
    amount.amount.toString + DefaultCurrency
  }

  implicit val zero: Zero[DefaultCurrencyMoney] = Zero.instance(DefaultCurrencyMoney(MoneyAmount.zero.get))
  implicit val ordering: Ordering[DefaultCurrencyMoney] = Ordering.by(_.moneyAmount)
}

/**
 * The plan is to represent money internally as a single amount, and enrich it with currency
 * whenever the frontend needs the information.
 *
 * Prefer using [[MoneyAmount]] rather than [[AnyCurrencyMoney]] or [[DefaultCurrencyMoney]].
 */
final case class MoneyAmount(amount: Amount) {
  def +(other: MoneyAmount): MoneyAmount = MoneyAmount(this.amount + other.amount)
  def +(other: DefaultCurrencyMoney): MoneyAmount = MoneyAmount(this.amount + other.amount)
  def -(other: MoneyAmount): MoneyAmount = MoneyAmount(this.amount - other.amount)
  def -(other: DefaultCurrencyMoney): MoneyAmount = MoneyAmount(this.amount - other.amount)
  def *(n: Amount): MoneyAmount = MoneyAmount(this.amount * n)
}
object MoneyAmount {
  implicit val ordering: Ordering[MoneyAmount] = Ordering.by(_.amount)
  implicit val zero: Zero[MoneyAmount] = Zero.instance(MoneyAmount(0))
  implicit val monoid: Monoid[MoneyAmount] = Monoid.instance(zero.get, _ + _)

  def apply(amount: Amount): MoneyAmount = new MoneyAmount(amount.setScale(2, RoundingMode.HALF_UP))
}
