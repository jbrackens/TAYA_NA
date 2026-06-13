package phoenix.markets.domain

import scala.collection.immutable

import enumeratum.Enum
import enumeratum.EnumEntry
import enumeratum.EnumEntry.UpperSnakecase
import enumeratum.NoSuchMember

sealed trait MarketType extends EnumEntry with UpperSnakecase
object MarketType extends Enum[MarketType] {
  override def values: immutable.IndexedSeq[MarketType] = findValues

  def fromString(raw: String): Either[NoSuchMember[MarketType], MarketType] = withNameEither(raw)

  final case object ActivatedRuneTypeSpawnedAt extends MarketType
  final case object BeyondGodlike extends MarketType
  final case object CorrectGoals extends MarketType
  final case object CorrectMatchScore extends MarketType
  final case object CorrectRoundScore extends MarketType
  final case object DragonSoulType extends MarketType
  final case object DragonType extends MarketType
  final case object FirstAegis extends MarketType
  final case object FirstBaron extends MarketType
  final case object FirstBarracks extends MarketType
  final case object FirstBlood extends MarketType
  final case object FirstDragon extends MarketType
  final case object FirstHalfWinner extends MarketType
  final case object FirstHalfWinnerMap extends MarketType
  final case object FirstInhibitor extends MarketType
  final case object FirstToReachXKills extends MarketType
  final case object FirstToReachXKillsMap extends MarketType
  final case object FirstToReachXRounds extends MarketType
  final case object FirstTower extends MarketType
  final case object FirstTurret extends MarketType
  final case object MapDuration extends MarketType
  final case object MapWinner extends MarketType
  final case object MatchHandicap extends MarketType
  final case object MatchWinner extends MarketType
  final case object Megacreeps extends MarketType
  final case object NthKill extends MarketType
  final case object NumberOfMaps extends MarketType
  final case object NumberOfRounds extends MarketType
  final case object NumberOfRoundsParity extends MarketType
  final case object Overtime extends MarketType
  final case object PentaKill extends MarketType
  final case object PistolRoundWinner extends MarketType
  final case object PlaceWithinTop extends MarketType
  final case object QuadraKill extends MarketType
  final case object Rampage extends MarketType
  final case object RoundHandicap extends MarketType
  final case object RoundWinner extends MarketType
  final case object SecondHalfWinner extends MarketType
  final case object SecondHalfWinnerMap extends MarketType
  final case object TotalGoals extends MarketType
  final case object TotalGoalsParity extends MarketType
  final case object TotalKills extends MarketType
  final case object TotalKillsParity extends MarketType
  final case object TotalTowers extends MarketType
  final case object TotalTurrets extends MarketType
  final case object UltraKill extends MarketType
  final case object Unknown extends MarketType
  final case object WillDragonBeSlayed extends MarketType
  final case object WinAtLeastOneMap extends MarketType
}
