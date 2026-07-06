package phoenix.core

import org.scalatest.matchers.must.Matchers
import org.scalatest.wordspec.AnyWordSpecLike

import phoenix.core.SeqUtils.SeqOps

class SeqUtilsSpec extends AnyWordSpecLike with Matchers {

  "groupByWithKeyOrderPreserved" should {

    "preserved key order and relative order of elements within groups" in {
      val original = Seq("foo" -> 1, "foo" -> 1, "bar" -> 2, "foo" -> 3, "qux" -> 4, "foo" -> 1, "qux" -> 5, "qux" -> 4)

      val expected = Seq("foo" -> Seq(1, 1, 3, 1), "bar" -> Seq(2), "qux" -> Seq(4, 5, 4)).map {
        case (key, values) =>
          key -> values.map(key -> _)
      }

      val actual = original.groupByWithKeyOrderPreserved(_._1)

      actual mustBe expected
    }
  }
}
