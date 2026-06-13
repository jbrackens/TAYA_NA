package phoenix.core.currency

import org.scalatest.matchers.should.Matchers
import org.scalatest.prop.TableDrivenPropertyChecks._
import org.scalatest.wordspec.AnyWordSpecLike

import phoenix.core.odds.Odds

class MoneySpec extends AnyWordSpecLike with Matchers {

  val defaultCurrencyMoneyFormats = Table(
    ("decimal", "formatted"),
    (1.000, "1.00USD"),
    (1.001, "1.00USD"),
    (1.002, "1.00USD"),
    (1.003, "1.00USD"),
    (1.004, "1.00USD"),
    (1.005, "1.01USD"),
    (1.006, "1.01USD"),
    (1.007, "1.01USD"),
    (1.008, "1.01USD"),
    (1.009, "1.01USD"))

  "DefaultCurrencyMoney" should {

    "format money amount with USD" in {
      forAll(defaultCurrencyMoneyFormats) { (decimal, formatted: String) =>
        DefaultCurrencyMoney.formatMoneyAmount(MoneyAmount(decimal)) shouldBe formatted
      }
    }

    "have no more then 2 digits after decimal point with rounding HALF_UP" when {
      "created" in {
        DefaultCurrencyMoney(MoneyAmount(1.995)) shouldBe DefaultCurrencyMoney(MoneyAmount(2.00))
        DefaultCurrencyMoney(MoneyAmount(1.994)) shouldBe DefaultCurrencyMoney(MoneyAmount(1.99))
      }

      "use multiplication" in {
        (DefaultCurrencyMoney(MoneyAmount(1.99)) * Odds(1.99)) shouldBe DefaultCurrencyMoney(MoneyAmount(3.96))
      }
    }
  }

  "MoneyAmount" should {
    "have no more then 2 digits after decimal point with rounding HALF_UP" when {
      "created" in {
        MoneyAmount(1.995) shouldBe MoneyAmount(2.00)
        MoneyAmount(1.994) shouldBe MoneyAmount(1.99)
      }

      "use multiplication" in {
        (MoneyAmount(1.99) * 1.99) shouldBe MoneyAmount(3.96)
      }
    }
  }
}
