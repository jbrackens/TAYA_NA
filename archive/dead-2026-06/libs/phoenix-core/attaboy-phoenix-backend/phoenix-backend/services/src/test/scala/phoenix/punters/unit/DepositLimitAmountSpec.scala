package phoenix.punters.unit

import org.scalatest.matchers.should.Matchers
import org.scalatest.prop.TableDrivenPropertyChecks
import org.scalatest.wordspec.AnyWordSpecLike

import phoenix.core.currency.MoneyAmount
import phoenix.punters.domain.DepositLimitAmount

final class DepositLimitAmountSpec extends AnyWordSpecLike with TableDrivenPropertyChecks with Matchers {
  "Deposit limit amount" should {
    "be >= 0" in {
      //format: off
      val table = Table(
        ("given_raw_value", "expected_valid"), 
        (1,                 true),
        (0,                 true),
        (-1,                false)
      )
      //format: on

      forAll(table) {
        case (givenRawValue, expectedValid) =>
          DepositLimitAmount.fromMoneyAmount(MoneyAmount(givenRawValue)).isValid shouldBe expectedValid
      }
    }
  }
}
