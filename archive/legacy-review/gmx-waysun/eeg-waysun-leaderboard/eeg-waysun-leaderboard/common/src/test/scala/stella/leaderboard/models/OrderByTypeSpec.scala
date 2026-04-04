package stella.leaderboard.models

import org.scalatest.flatspec.AnyFlatSpec
import org.scalatest.matchers.should

class OrderByTypeSpec extends AnyFlatSpec with should.Matchers {

  "findByName" should "return proper results" in {
    OrderByType.findByName("field_value") shouldBe Some(OrderByType.FieldValue)
    OrderByType.findByName("min") shouldBe Some(OrderByType.Min)
    OrderByType.findByName("max") shouldBe Some(OrderByType.Max)
    OrderByType.findByName("sum") shouldBe Some(OrderByType.Sum)
    OrderByType.findByName("count") shouldBe Some(OrderByType.Count)

    OrderByType.values.foreach { orderByType =>
      OrderByType.findByName(orderByType.entryName.toUpperCase) shouldBe None
    }
    OrderByType.findByName("foo") shouldBe None
  }
}
