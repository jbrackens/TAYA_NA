package phoenix.betgenius.domain

import scala.collection.immutable

import enumeratum.Enum
import enumeratum.EnumEntry
import enumeratum.EnumEntry.UpperSnakecase
import enumeratum.NoSuchMember

case class UnableToMatchMarketDescription(description: String) extends Throwable

sealed trait MarketTypeEnum extends EnumEntry with UpperSnakecase
object MarketTypeEnum extends Enum[MarketTypeEnum] {
  override def values: immutable.IndexedSeq[MarketTypeEnum] = findValues

  def forMarketTypeName(marketTypeName: MarketTypeName): MarketTypeEnum =
    marketTypeName.value match {
      case "Draw No Bet"                                                    => DrawNoBet
      case m if m.startsWith("Match Result (")                              => MatchWinner
      case "Match Up Handicap"                                              => MatchHandicap
      case "Total Maps Played Over/Under"                                   => NumberOfMaps
      case m if m.endsWith(" Correct Score")                                => CorrectMatchScore
      case "Team to Score a Quadra Kill"                                    => QuadraKill
      case "Team to Score a Penta Kill"                                     => PentaKill
      case m if m.matches("Map \\d Winner.*")                               => MapWinner
      case m if m.matches("Map \\d Team to Win the Next Round")             => RoundWinner
      case m if m.endsWith("Rounds Handicap")                               => RoundHandicap
      case m if m.endsWith("Pistol Round Winner")                           => PistolRoundWinner
      case m if m.endsWith("Total Number of Rounds")                        => NumberOfRounds
      case m if m.endsWith("Team to Score the Most Kills Handicap")         => Unknown // ?
      case m if m.matches("Map \\d Game Time Over/Under")                   => MapDuration
      case m if m.matches("Map \\d Race to \\d+ Kills")                     => FirstToReachXKillsMap
      case m if m.endsWith("Team to Slay the Next Roshan")                  => Megacreeps // ?
      case m if m.endsWith("Total Roshans Slain Over/Under")                => Megacreeps // ?
      case m if m.endsWith("Team to Destroy the Next Barracks")             => FirstBarracks // ?
      case m if m.endsWith("Team to Slay the Next Dragon")                  => FirstDragon // ?
      case m if m.endsWith("Team to Slay the Next Baron")                   => FirstBaron // ?
      case m if m.endsWith("Team to Destroy the Next Inhibitor")            => FirstInhibitor // ?
      case m if m.endsWith("Total Inhibitors Destroyed Over/Under")         => TotalInhibitors
      case m if m.endsWith("Total Dragons Slain Over/Under")                => TotalDragons
      case m if m.endsWith("Total Dragons Slain")                           => TotalDragons
      case m if m.endsWith("Total Barons Slain")                            => TotalBarons
      case m if m.endsWith("Total Inhibitors Destroyed")                    => TotalInhibitors
      case m if m.endsWith("Both Teams to Slay a Dragon")                   => BothTeamsSlayDragon
      case m if m.endsWith("Both Teams to Destroy an Inhibitor")            => BothTeamsDestroyInhibitor
      case m if m.endsWith("Both Teams to Slay a Baron")                    => BothTeamsSlayBaron
      case m if m.endsWith("Total Barons Slain Over/Under")                 => TotalBarons
      case m if m.endsWith("Team to Draw First Blood")                      => FirstBlood
      case m if m.endsWith("Total Kills Scored Over/Under")                 => TotalKills
      case m if m.endsWith("Team to Destroy the Next Tower")                => FirstTower // ?
      case m if m.endsWith("Total Towers Destroyed Over/Under")             => TotalTowers
      case m if m.endsWith("Total Towers Destroyed")                        => TotalTowers
      case m if m.endsWith("Team to Score the Next Kill")                   => FirstKill
      case m if m.endsWith("Team to Score the Most Kills")                  => TotalKills // ?
      case m if m.endsWith("Total Kills Odd/Even")                          => TotalKills // ?
      case m if m.endsWith("Race to 3 Rounds")                              => FirstToReachXRounds // ?
      case "Numbered Game Asian Handicap"                                   => MatchHandicap // ?
      case "Numbered Game Both Teams to Score"                              => BothTeamsToScore
      case "Numbered Game Double Chance"                                    => DoubleChance
      case "Numbered Game Draw No Bet"                                      => DrawNoBet // ?
      case "Numbered Game Match Result"                                     => MatchWinner // ?
      case "Numbered Game Next Team To Score"                               => FirstToScore
      case "Numbered Game Total Goals Over/Under"                           => CorrectMatchScore // ?
      case "Numbered Game Winner"                                           => MatchWinner
      case "Numbered Game Total Points Over/Under"                          => CorrectMatchScore // ?
      case "Numbered Game Handicap 3-way"                                   => MatchHandicap
      case "Numbered Game Numbered Half Result"                             => FirstHalfWinner
      case "Numbered Game Numbered Half Total Goals Over/Under"             => CorrectRoundScore // ?
      case "Numbered Game Numbered Half Handicap 2 way"                     => RoundHandicap
      case m if m.matches("Numbered Map Team (A|B) Total Kills Over/Under") => TotalKills
      case "Numbered Game Numbered Half Money Line"                         => FirstHalfWinner // ?
      case "Numbered Game Numbered Half Total Points Over/Under"            => CorrectRoundScore // ?
      case "Numbered Map Numbered Half Winner"                              => FirstHalfWinner // ?
      case "Numbered Game Numbered Half Handicap 3-way"                     => RoundHandicap // ?
      case "Numbered Map Team to Win Both Pistol Rounds"                    => PistolRoundWinner
      case "Numbered Game \\w{4} Team Total Goals Over/Under"               => CorrectMatchScore
      case "Numbered Game \\w{4} Team Total Points Over/Under"              => CorrectMatchScore
      case _                                                                => throw UnableToMatchMarketDescription(marketTypeName.value)
    }

  def fromString(raw: String): Either[NoSuchMember[MarketTypeEnum], MarketTypeEnum] = withNameEither(raw)

  final case object BothTeamsDestroyInhibitor extends MarketTypeEnum
  final case object BothTeamsSlayBaron extends MarketTypeEnum
  final case object BothTeamsSlayDragon extends MarketTypeEnum
  final case object BothTeamsToScore extends MarketTypeEnum
  final case object CorrectMatchScore extends MarketTypeEnum
  final case object CorrectRoundScore extends MarketTypeEnum
  final case object DoubleChance extends MarketTypeEnum
  final case object DrawNoBet extends MarketTypeEnum
  final case object FirstBaron extends MarketTypeEnum
  final case object FirstBarracks extends MarketTypeEnum
  final case object FirstBlood extends MarketTypeEnum
  final case object FirstDragon extends MarketTypeEnum
  final case object FirstHalfWinner extends MarketTypeEnum
  final case object FirstInhibitor extends MarketTypeEnum
  final case object FirstKill extends MarketTypeEnum
  final case object FirstToScore extends MarketTypeEnum
  final case object FirstToReachXKillsMap extends MarketTypeEnum
  final case object FirstToReachXRounds extends MarketTypeEnum
  final case object FirstTower extends MarketTypeEnum
  final case object MapDuration extends MarketTypeEnum
  final case object MapWinner extends MarketTypeEnum
  final case object MatchHandicap extends MarketTypeEnum
  final case object MatchWinner extends MarketTypeEnum
  final case object Megacreeps extends MarketTypeEnum
  final case object NumberOfMaps extends MarketTypeEnum
  final case object NumberOfRounds extends MarketTypeEnum
  final case object PentaKill extends MarketTypeEnum
  final case object PistolRoundWinner extends MarketTypeEnum
  final case object QuadraKill extends MarketTypeEnum
  final case object RoundHandicap extends MarketTypeEnum
  final case object RoundWinner extends MarketTypeEnum
  final case object TotalDragons extends MarketTypeEnum
  final case object TotalBarons extends MarketTypeEnum
  final case object TotalKills extends MarketTypeEnum
  final case object TotalInhibitors extends MarketTypeEnum
  final case object TotalTowers extends MarketTypeEnum
  final case object Unknown extends MarketTypeEnum
}
