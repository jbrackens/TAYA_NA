package phoenix.core.odds

import org.scalatest.matchers.should.Matchers
import org.scalatest.prop.TableDrivenPropertyChecks._
import org.scalatest.wordspec.AnyWordSpecLike

class FractionalOddsSpec extends AnyWordSpecLike with Matchers {

  val oddsConversions =
    Table(
      ("decimal", "fractional"),
      (Odds(1.01), "1/100"),
      (Odds(1.4), "2/5"),
      (Odds(1.5), "1/2"),
      (Odds(1.99), "1/1"),
      (Odds(2), "1/1"),
      (Odds(2.01), "1/1"),
      (Odds(2.1), "11/10"),
      (Odds(3), "2/1"),
      (Odds(4), "3/1"),
      (Odds(999.99), "1000/1"))

  "convert specific decimal values to expected fractional values" in {
    forAll(oddsConversions) { (decimal: Odds, fractional: String) =>
      FractionalOdds.fromDecimal(decimal).value shouldBe fractional
    }
  }

  "all possible Odds values can be converted without throwing exceptions" in {
    (BigDecimal(1.01) until BigDecimal(1000.0) by BigDecimal(0.01)).foreach { i =>
      FractionalOdds.fromDecimal(Odds(i))
    }
  }
}
