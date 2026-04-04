package gmx.common.internal.partner.sbtech.cons

import scala.collection.breakOut

import enumeratum.Enum
import enumeratum.EnumEntry
import tech.argyll.video.domain.model.MarketType

sealed trait SBTechMarketType extends EnumEntry {
  def sbtechId: String
  def marketType: MarketType
}

object SBTechMarketType extends Enum[SBTechMarketType] {
  class SBTechMarketTypeRecord(val sbtechId: String, val marketType: MarketType) extends SBTechMarketType

  val values = findValues

  private val byId: Map[String, SBTechMarketType] = values.map(elem => (elem.sbtechId, elem))(breakOut)

  final case object FullTimeMoneyLine extends SBTechMarketTypeRecord("1_0", MarketType.MATCH_ODDS)

  final case object OutrightWinner extends SBTechMarketTypeRecord("8", MarketType.OUTRIGHT_WINNER)

  final case object DoubleChance extends SBTechMarketTypeRecord("61", MarketType.DOUBLE_CHANCE)
  final case object DrawNoBet extends SBTechMarketTypeRecord("2_157", MarketType.DRAW_NO_BET)
  final case object BothTeamsToScore extends SBTechMarketTypeRecord("158", MarketType.BOTH_TEAMS_TO_SCORE)

  final case object RaceCard extends SBTechMarketTypeRecord("341", MarketType.RACE_CARD)
  final case object BettingWithoutFavorite extends SBTechMarketTypeRecord("767", MarketType.BETTING_WITHOUT_FAV)
  final case object BettingWithout2Favorites extends SBTechMarketTypeRecord("770", MarketType.BETTING_WITHOUT_TWO_FAV)
  final case object PlaceOnly extends SBTechMarketTypeRecord("768", MarketType.PLACE_ONLY)
  final case object MatchBetting extends SBTechMarketTypeRecord("769", MarketType.MATCH_BETTING)

  def findById(in: String): Option[SBTechMarketType] = byId.get(in)
}

//TODO (GM-1745): not needed?
//final case object FullTimeSpread extends SBTechMarketTypeRecord("2_0", MarketType.SPREAD)
//final case object FullTimeOverUnder extends SBTechMarketTypeRecord("3_0", MarketType.OVER_UNDER)
//SPECIAL_BETS(1370013L, SBTechEventType.SPECIAL_BETS, SBTechLineType.SPECIAL, MarketType.SPECIAL_BETS),
//SPECIAL_BETS_PRICE_BOOSTS(32630013L, SBTechEventType.SPECIAL_BETS_PRICE_BOOSTS, SBTechLineType.SPECIAL, MarketType.SPECIAL_BETS_PRICE_BOOSTS)

// 4_341 -> Forecast
// 5_341 -> Tricast
