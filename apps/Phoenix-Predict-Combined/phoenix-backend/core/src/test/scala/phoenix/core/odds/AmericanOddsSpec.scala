package phoenix.core.odds

import org.scalatest.matchers.should.Matchers
import org.scalatest.prop.TableDrivenPropertyChecks._
import org.scalatest.wordspec.AnyWordSpecLike

class AmericanOddsSpec extends AnyWordSpecLike with Matchers {

  val oddsConversions = Table(
    ("decimal", "american"),
    (Odds(1.01), "-10000"),
    (Odds(1.5), "-200"),
    (Odds(1.99), "+100"),
    (Odds(2), "+100"),
    (Odds(2.1), "+110"),
    (Odds(3), "+200"),
    (Odds(999.99), "+100000"))

  "convert specific decimal values to expected fractional values" in {
    forAll(oddsConversions) { (decimal: Odds, american: String) =>
      AmericanOdds.fromDecimal(decimal).value shouldBe american
    }
  }
}
