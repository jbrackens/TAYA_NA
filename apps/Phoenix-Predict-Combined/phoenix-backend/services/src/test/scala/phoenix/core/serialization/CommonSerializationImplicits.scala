package phoenix.core.serialization

import scala.math.Ordered.orderingToOrdered

import cats.kernel.Eq
import org.scalacheck.Arbitrary
import org.scalacheck.Gen

import phoenix.core.currency.DefaultCurrency
import phoenix.core.currency.DefaultCurrencyMoney
import phoenix.core.currency.PositiveAmount
import phoenix.core.currency.Zero
import phoenix.core.odds.Odds

object CommonSerializationImplicits {
  implicit lazy val defaultCurrencyMoneyEq: Eq[DefaultCurrencyMoney] = Eq.fromUniversalEquals
  implicit lazy val defaultCurrencyMoneyArbitrary: Arbitrary[DefaultCurrencyMoney] =
    Arbitrary(Arbitrary.arbitrary[BigDecimal].map(amount => DefaultCurrencyMoney(amount, DefaultCurrency)))

  implicit lazy val oddsArbitrary: Arbitrary[Odds] = Arbitrary(
    Gen.chooseNum(Odds.MinValue, Odds.MaxValue).filterNot(_ == Odds.MaxValue).map(Odds.apply))

  implicit def positiveAmountArbitrary[T: Arbitrary: Zero: Ordering]: Arbitrary[PositiveAmount[T]] =
    Arbitrary(Arbitrary.arbitrary[T].filter(_ > Zero[T].get).map(PositiveAmount(_)))
}
