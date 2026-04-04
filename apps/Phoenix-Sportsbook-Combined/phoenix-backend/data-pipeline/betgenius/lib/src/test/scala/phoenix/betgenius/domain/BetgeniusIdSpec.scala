package phoenix.betgenius.domain

import org.scalatest.matchers.should.Matchers
import org.scalatest.prop.TableDrivenPropertyChecks
import org.scalatest.wordspec.AnyWordSpec

class BetgeniusIdSpec extends AnyWordSpec with Matchers with TableDrivenPropertyChecks {

  val examples = Table(
    ("id", "expected prefix"),
    (SportId(1), "s:b:1"),
    (SeasonId(1), "t:b:1"),
    (CompetitorId(1), "c:b:1"),
    (FixtureId(1), "f:b:1"),
    (SelectionId(1), "sn:b:1"),
    (MarketId(1), "m:b:1"))

  forAll(examples) { (id, expectedNamespaced) =>
    s"${id.getClass.getSimpleName}" should {
      "correctly return namespaced id" in {
        id.namespaced shouldEqual expectedNamespaced
      }
    }
  }

  "all identifiers" should {
    "be unique" in {
      val allNamespaced = examples.map { case (_, expectedNamespaced) => expectedNamespaced }
      allNamespaced.distinct shouldEqual allNamespaced
    }
  }
}
