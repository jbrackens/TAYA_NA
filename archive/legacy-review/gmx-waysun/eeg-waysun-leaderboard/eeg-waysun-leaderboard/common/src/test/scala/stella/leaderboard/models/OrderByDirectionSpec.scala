package stella.leaderboard.models

import org.scalatest.flatspec.AnyFlatSpec
import org.scalatest.matchers.should
import org.scalatestplus.scalacheck.ScalaCheckDrivenPropertyChecks

class OrderByDirectionSpec extends AnyFlatSpec with should.Matchers with ScalaCheckDrivenPropertyChecks {

  "findByName" should "return proper values" in {
    OrderByDirection.findByName("desc") shouldBe Some(OrderByDirection.Desc)
    OrderByDirection.findByName("asc") shouldBe Some(OrderByDirection.Asc)
    OrderByDirection.findByName("ASC") shouldBe None
    OrderByDirection.findByName("DESC") shouldBe None
    OrderByDirection.findByName("foo") shouldBe None
  }
}
