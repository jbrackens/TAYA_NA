package phoenix.oddin.domain

import org.scalatest.matchers.should.Matchers
import org.scalatest.prop.TableDrivenPropertyChecks
import org.scalatest.wordspec.AnyWordSpec

import phoenix.oddin.domain.marketDescription.MarketDescription
import phoenix.oddin.domain.marketDescription.MarketDescriptionName

class MarketCategorySpec extends AnyWordSpec with Matchers with TableDrivenPropertyChecks {

  val emptyMap = Map[String, String]()

  val marketCategories = Table(
    ("marketName", "specifiers", "marketCategory"),
    ("Activated rune type spawned at {time} {time_unit} - map {map}", emptyMap, "Activated rune type spawned at time"),
    ("First half winner {way}way - map {map}", Map("way" -> "three"), "First half winner threeway"),
    ("First to reach {threshold} kills", emptyMap, "First to reach X kills"),
    ("Map {map} winner - {way}way", Map("way" -> "two"), "Map X winner - twoway"),
    ("Pistol Round {order} winner - map {map}", emptyMap, "Pistol Round X winner"),
    ("Round handicap {handicap} - map {map}", emptyMap, "Round handicap"),
    ("Round {round} winner - map {map}", emptyMap, "Round X winner"),
    ("Will be {kind} dragon slayed? - map {map}", emptyMap, "Will be X dragon slayed?"),
    ("{side} wins at least one map", emptyMap, "X wins at least one map"))

  forAll(marketCategories) { (marketName, specifiers, marketCategory) =>
    val extractedValue = MarketCategory.fromMarketDescription(
      MarketDescription(MarketDescriptionId.apply(0), MarketDescriptionName(marketName), None, List()),
      MarketSpecifiers(specifiers))

    extractedValue.value shouldBe marketCategory
  }

}
