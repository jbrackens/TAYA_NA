package phoenix.oddin.domain

import scala.collection.immutable

import enumeratum.Enum
import enumeratum.EnumEntry
import enumeratum.EnumEntry.UpperSnakecase
import enumeratum.NoSuchMember

import phoenix.oddin.domain.marketDescription.MarketDescriptionName

case class UnableToMatchMarketDescription(description: String)

sealed trait MarketType extends EnumEntry with UpperSnakecase
object MarketType extends Enum[MarketType] {
  override def values: immutable.IndexedSeq[MarketType] = findValues

  def forMarketDescriptionName(
      marketDescriptionName: MarketDescriptionName): Either[UnableToMatchMarketDescription, MarketType] =
    marketDescriptionName.value match {
      case "Activated rune type spawned at {time} {time_unit} - map {map}" => Right(ActivatedRuneTypeSpawnedAt)
      case "Beyond godlike - map {map}"                                    => Right(BeyondGodlike)
      case "Correct goal score - map {map}"                                => Right(CorrectGoals)
      case "Correct match score"                                           => Right(CorrectMatchScore)
      case "Correct round score - map {map}"                               => Right(CorrectRoundScore)
      case "Dragon soul type - map {map}"                                  => Right(DragonSoulType)
      case "{order}. dragon type - map {map}"                              => Right(DragonType)
      case "First Aegis - map {map}"                                       => Right(FirstAegis)
      case "First Baron - map {map}"                                       => Right(FirstBaron)
      case "First barracks - map {map}"                                    => Right(FirstBarracks)
      case "First blood - map {map}"                                       => Right(FirstBlood)
      case "First dragon - map {map}"                                      => Right(FirstDragon)
      case "First half winner - {way}way"                                  => Right(FirstHalfWinner)
      case "First half winner {way}way - map {map}"                        => Right(FirstHalfWinnerMap)
      case "First inhibitor - map {map}"                                   => Right(FirstInhibitor)
      case "First to reach {threshold} kills"                              => Right(FirstToReachXKills)
      case "First to reach {threshold} kills - map {map}"                  => Right(FirstToReachXKillsMap)
      case "First to reach {threshold} rounds - map {map}"                 => Right(FirstToReachXRounds)
      case "First tower - map {map}"                                       => Right(FirstTower)
      case "First turret - map {map}"                                      => Right(FirstTurret)
      case "Map duration {threshold} - map {map}"                          => Right(MapDuration)
      case "Map {map} winner - {way}way"                                   => Right(MapWinner)
      case "Match handicap {handicap}"                                     => Right(MatchHandicap)
      case "Match winner - {way}way"                                       => Right(MatchWinner)
      case "Megacreeps - map {map}"                                        => Right(Megacreeps)
      case "{threshold}th kill - map {map}"                                => Right(NthKill)
      case "Number of maps {threshold}"                                    => Right(NumberOfMaps)
      case "Number of rounds {threshold} - map {map}"                      => Right(NumberOfRounds)
      case "Number of rounds parity - map {map}"                           => Right(NumberOfRoundsParity)
      case "Overtime - map {map}"                                          => Right(Overtime)
      case "Penta kill - map {map}"                                        => Right(PentaKill)
      case "Pistol Round {order} winner - map {map}"                       => Right(PistolRoundWinner)
      case "Place within TOP{threshold} - map {map}"                       => Right(PlaceWithinTop)
      case "Quadra kill - map {map}"                                       => Right(QuadraKill)
      case "Rampage - map {map}"                                           => Right(Rampage)
      case "Round handicap {handicap} - map {map}"                         => Right(RoundHandicap)
      case "Round {round} winner - map {map}"                              => Right(RoundWinner)
      case "Second half winner - {way}way"                                 => Right(SecondHalfWinner)
      case "Second half winner {way}way - map {map}"                       => Right(SecondHalfWinnerMap)
      case "Total goals {threshold} - map {map}"                           => Right(TotalGoals)
      case "Total goals parity - map {map}"                                => Right(TotalGoalsParity)
      case "Total kills {threshold} - map {map}"                           => Right(TotalKills)
      case "Total kills parity - map {map}"                                => Right(TotalKillsParity)
      case "Total towers {threshold} - map {map}"                          => Right(TotalTowers)
      case "Total turrets {threshold} - map {map}"                         => Right(TotalTurrets)
      case "Ultra kill - map {map}"                                        => Right(UltraKill)
      case "Will be {kind} dragon slayed? - map {map}"                     => Right(WillDragonBeSlayed)
      case "{side} wins at least one map"                                  => Right(WinAtLeastOneMap)
      case _                                                               => Left(UnableToMatchMarketDescription(marketDescriptionName.value))
    }

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
