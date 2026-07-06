package phoenix.core.odds

import scala.math.Ordering.Implicits._

import org.scalatest.matchers.should.Matchers
import org.scalatest.wordspec.AnyWordSpecLike

final class OddsSpec extends AnyWordSpecLike with Matchers {

  "Odds" should {
    "not allow decimal values less than 1" in {
      assertThrows[IllegalArgumentException] {
        Odds(0.9)
      }
    }

    "not allow decimal values greater than or equal to 1000" in {
      assertThrows[IllegalArgumentException] {
        Odds(1000)
      }
    }

    s"coerce decimal values between 1 and ${Odds.MinValue} to ${Odds.MinValue}" in {
      Odds(1) shouldBe Odds(Odds.MinValue)
    }

    "allow comparing odds" in {
      // given
      val shorter = Odds(1.01)
      val longer = Odds(1.02)

      // then
      shorter < longer shouldBe true
      longer < shorter shouldBe false

      longer > shorter shouldBe true
      shorter > longer shouldBe false
    }

    "allow multiplication by number" in {
      // given
      val odds = Odds(1.4)

      // then
      (odds * 2) shouldBe Odds(1.8)
    }

    "allow division by number" in {
      // given
      val odds = Odds(1.4)

      // then
      (odds / 2) shouldBe Odds(1.2)
    }

    "keep .4 arithmetic precision" in {
      // given
      val odds = Odds(1.44443)

      // then
      odds shouldBe Odds(1.4444)
      (odds * 2.2) shouldBe Odds(1.9777)
      (odds / 2.1) shouldBe Odds(1.2116)
    }
  }
}
