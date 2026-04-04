package phoenix.markets

import org.scalatest.matchers.must.Matchers
import org.scalatest.wordspec.AnyWordSpecLike

import phoenix.support.DataGenerator._

class MarketSelectionsSpec extends AnyWordSpecLike with Matchers {

  classOf[MarketSelections].getSimpleName when {

    val id1 = generateSelectionId()
    val name1 = generateSelectionName()
    val odds1 = Some(generateOdds())

    val id2 = generateSelectionId()
    val name2 = generateSelectionName()
    val odds2 = Some(generateOdds())

    "initially created" should {

      "have empty selections and odds" in {
        val marketSelections = MarketSelections.empty
        marketSelections.selections must have size 0
      }

      "populate with all change objects" in {
        val changes = Seq(SelectionOdds(id1, name1, odds1, true), SelectionOdds(id2, name2, odds2, false))

        val selections = MarketSelections.empty
        selections.update(changes) must be(
          MarketSelections(
            Map(id1 -> SelectionOdds(id1, name1, odds1, true), id2 -> SelectionOdds(id2, name2, odds2, false))))
      }
    }

    "already populated" should {

      "update current selections with changes" in {
        val changes = Seq(SelectionOdds(id1, name1, odds1, true), SelectionOdds(id2, name2, odds2, false))

        val before =
          MarketSelections(
            Map(
              id1 -> SelectionOdds(id1, generateSelectionName(), Some(generateOdds()), false),
              id2 -> SelectionOdds(id2, generateSelectionName(), Some(generateOdds()), true)))
        val after = before.update(changes)

        after must be(
          MarketSelections(
            Map(id1 -> SelectionOdds(id1, name1, odds1, true), id2 -> SelectionOdds(id2, name2, odds2, false))))
      }
    }
  }
}
