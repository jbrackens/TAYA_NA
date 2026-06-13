package phoenix.markets

import io.circe.generic.extras.JsonKey

import phoenix.core.odds.Odds
import phoenix.markets.MarketLifecycle.Bettable
import phoenix.markets.MarketsBoundedContext.MarketId
import phoenix.markets.MarketsBoundedContext.SelectionId
import phoenix.markets.domain.MarketType
import phoenix.markets.infrastructure.MarketsAkkaSerializable
import phoenix.markets.sports.SportEntity.FixtureId

sealed trait MarketState extends MarketsAkkaSerializable

case object Uninitialized extends MarketState

final case class InitializedMarket(
    id: MarketId,
    info: MarketInfo,
    lifecycle: MarketLifecycle,
    marketSelections: MarketSelections)
    extends MarketState {

  def hasSelection(selectionId: SelectionId): Boolean =
    marketSelections.findSelection(selectionId).isDefined

  def updateOdds(selectionOdds: Seq[SelectionOdds]): InitializedMarket =
    copy(marketSelections = marketSelections.update(selectionOdds))

  def updateInfo(marketInfo: MarketInfo): InitializedMarket =
    copy(info = marketInfo)

  def changeLifecycle(lifecycle: MarketLifecycle): InitializedMarket =
    copy(lifecycle = lifecycle)

  def isBettable: Boolean =
    lifecycle match {
      case _: Bettable => true
      case _           => false
    }
}

object InitializedMarket {
  def apply(id: MarketId, info: MarketInfo, lifecycle: MarketLifecycle, odds: Seq[SelectionOdds]): InitializedMarket =
    InitializedMarket(id, info, lifecycle, MarketSelections(odds))
}

case class MarketInfo(
    name: String,
    fixtureId: FixtureId,
    marketType: MarketType,
    category: Option[MarketCategory],
    specifiers: Seq[MarketSpecifier]) {
  def withName(newName: String): MarketInfo = copy(name = newName)
}

/**
 * Represents additional specifiers of a market.
 *
 * This is inspired by the concept of "specifiers" from Oddin.
 *
 * @param key Represented as a String, but in these are likely to be fixed names like "handicap" and "side"
 * @param value These are also likely to be taken from a fixed range like "home" and "away" for "side"
 */
final case class MarketSpecifier(key: String, value: String)

final case class ValueSpecifier(value: String)
final case class MapSpecifier(value: String)
final case class UnitSpecifier(value: String)
final case class MarketSpecifiers(value: Option[ValueSpecifier], map: Option[MapSpecifier], unit: Option[UnitSpecifier])

final case class MarketCategory(value: String)

case class MarketSelections(selections: Map[SelectionId, SelectionOdds]) {

  def update(changes: Seq[SelectionOdds]): MarketSelections = {
    val newSelections = changes.map(odds => odds.selectionId -> odds)
    MarketSelections(selections ++ newSelections)
  }

  def findSelection(id: SelectionId): Option[SelectionOdds] =
    selections.get(id)

  def toSeq: Seq[SelectionOdds] = selections.values.toSeq
}

object MarketSelections {
  val empty: MarketSelections = apply(Seq.empty)

  def apply(odds: Seq[SelectionOdds]): MarketSelections =
    new MarketSelections(Map.empty).update(odds)
}

final case class SelectionOdds(
    selectionId: SelectionId,
    selectionName: String,
    @JsonKey("displayOdds") odds: Option[Odds],
    active: Boolean)
