package phoenix.suppliers.oddin

import org.scalatest.matchers.should.Matchers
import org.scalatest.prop.TableDrivenPropertyChecks
import org.scalatest.wordspec.AnyWordSpec

class PhoenixOddinConvertersSpec extends AnyWordSpec with Matchers with TableDrivenPropertyChecks {

  "PhoenixOddinConverter" should {
    "extract threshold from specifiers" in {
      //@formatter:off
      val specifiersTable = Table(
        ("specifierKey" , "expectedKey"  ),
        ("threshold"    , "value"        ),
        ("handicap"     , "value"        ),
        ("round"        , "value"        ),
        ("side"         , "value"        ),
        ("time"         , "value"        ),
        ("time_unit"    , "unit"         ),
        ("somethingelse", "somethingelse")
      )
      //@formatter:on

      forAll(specifiersTable) {
        case (key, expected) =>
          PhoenixOddinConverters.standardiseSpecifiers(key -> "someValue") shouldBe expected -> "someValue"
      }
    }
  }

}
