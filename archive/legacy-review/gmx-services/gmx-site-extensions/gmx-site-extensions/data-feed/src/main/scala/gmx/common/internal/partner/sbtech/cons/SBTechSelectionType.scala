package gmx.common.internal.partner.sbtech.cons

import scala.collection.breakOut

import enumeratum.Enum
import enumeratum.EnumEntry
import tech.argyll.video.domain.model.SelectionType

sealed trait SBTechSelectionType extends EnumEntry {
  def sbtechId: String
  def selectionType: SelectionType
}

object SBTechSelectionType extends Enum[SBTechSelectionType] {
  class SBTechSelectionTypeRecord(val sbtechId: String, val selectionType: SelectionType) extends SBTechSelectionType

  val values = findValues

  private val byId: Map[String, SBTechSelectionType] = values.map(elem => (elem.sbtechId, elem))(breakOut)

  final case object MoneyLine extends SBTechSelectionTypeRecord("1", SelectionType.MONEY_LINE)
  final case object Spread extends SBTechSelectionTypeRecord("2", SelectionType.SPREAD)
  final case object Total extends SBTechSelectionTypeRecord("3", SelectionType.TOTAL)
  final case object Winner extends SBTechSelectionTypeRecord("4", SelectionType.WINNER)

  final case object DoubleChance extends SBTechSelectionTypeRecord("11", SelectionType.DOUBLE_CHANCE)
  //TODO (GM-1745): investigate how to name this type, it's used for BOTH_TEAMS_TO_SCORE, BETTING_WITHOUT_FAV, SPECIAL_BETS, PRICE_BOOSTS
  final case object Special extends SBTechSelectionTypeRecord("13", SelectionType.SPECIAL)

  final case object AntePost extends SBTechSelectionTypeRecord("18", SelectionType.ANTE_POST)
  final case object NonRunnerNoBet extends SBTechSelectionTypeRecord("20", SelectionType.NON_RUNNER)
  final case object DayOfEvent extends SBTechSelectionTypeRecord("22", SelectionType.DAY_OF_EVENT)
  final case object StartingPrice extends SBTechSelectionTypeRecord("24", SelectionType.STARTING_PRICE)

  def findById(in: String): Option[SBTechSelectionType] = byId.get(in)
}
