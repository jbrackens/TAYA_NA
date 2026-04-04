package net.flipsports.gmx.common.internal.scala.core.collection

import org.junit.runner.RunWith
import org.scalatest.FunSuite
import org.scalatest.Matchers._
import org.scalatest.junit.JUnitRunner

@RunWith(classOf[JUnitRunner])
class CollectionsOpsTest extends FunSuite {

  private val objectUnderTest = new CollectionsOps {}

  test("'outerJoin()' should zip collections of pairs using key") {
    // given

    val givenCollection1 = Seq(("4", "home"), ("2", "away"), ("5", "home2"), ("8", "")).toList.sortBy(_._1)

    val givenCollection2 =
      Seq(("5", "name5"), ("2", "name2"), ("3", "name3"), ("1", "name1"), ("4", "name4"), ("6", "name6")).toList
        .sortBy(_._1)

    // when
    val actual = objectUnderTest.outerJoin(givenCollection1, givenCollection2).reverse

    // then
    assert(actual.size == 7)

    actual(0) should matchPattern { case (None, Some("name1"))          => }
    actual(1) should matchPattern { case (Some("away"), Some("name2"))  => }
    actual(2) should matchPattern { case (None, Some("name3"))          => }
    actual(3) should matchPattern { case (Some("home"), Some("name4"))  => }
    actual(4) should matchPattern { case (Some("home2"), Some("name5")) => }
    actual(5) should matchPattern { case (None, Some("name6"))          => }
    actual(6) should matchPattern { case (Some(""), None)               => }

  }
}
