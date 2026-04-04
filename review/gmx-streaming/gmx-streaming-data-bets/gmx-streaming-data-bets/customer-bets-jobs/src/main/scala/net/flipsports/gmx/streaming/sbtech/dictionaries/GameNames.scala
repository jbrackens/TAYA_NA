package net.flipsports.gmx.streaming.sbtech.dictionaries

import ca.mrvisser.sealerate

sealed abstract class GameNames(val id: Int, val name: String)

object GameNames {

  case object CasinoStudPoker extends GameNames(3628, "Casino Stud Poker")
  case object PokerPursuit extends GameNames(830, "Poker Pursuit")
  case object PowerBlackjack extends GameNames(31377, "Power Blackjack")
  case object InstantHorses extends GameNames(id = 11883, name = "Instant Horses")
  case object ImmortalRomance extends GameNames(id = 1059, name = "Immortal Romance")
  case object TheGoonies extends GameNames(id = 21841, name = "The Goonies")
  case object GoldDigger extends GameNames(id = 31475, name = "Gold Digger")
  case object SheriffofNottingham extends GameNames(id = 30528, name = "Sheriff of Nottingham")
  case object BlackjackSinglehandSportNation extends GameNames(id = 26575, name = "Blackjack Single hand SportNation")
  case object EuropeanRouletteSportNation extends GameNames(id = 26577, name = "European Roulette SportNation")
  case object Roulette extends GameNames(id = 15583, name = "Roulette")
  case object BaccaratExclusive extends GameNames(id = 28762, name = "Baccarat Exclusive")
  case object EuropeanBlackjackRedealGold extends GameNames(id = 1375, name = "European Blackjack Redeal Gold")
  case object BlackJackMH extends GameNames(id = 3514, name = "BlackJack MH")
  case object JacksorBetter extends GameNames(id = 1205, name = "Jacks or Better")
  case object JokerPokerMH extends GameNames(id = 3526, name = "Joker Poker MH")
  case object UltimateTexasHoldem extends GameNames(id = 5530, name = "Ultimate Texas Holdem")
  case object CrazyTime extends GameNames(id = 31107, name = "Crazy Time")
  case object SpeedBaccaratA extends GameNames(id = 15511, name = "Speed Baccarat A")
  case object MegaBall extends GameNames(id = 30633, name = "Mega Ball")
  case object Roulette6 extends GameNames(id = 22507, name = "Roulette 6")
  case object DragonTiger extends GameNames(id = 7640, name = "Dragon Tiger")
  case object Footballstudio extends GameNames(id = 15463, name = "Football studio")
  case object TexasHoldemBonusPoker extends GameNames(id = 15481, name = "Texas Hold'em Bonus Poker")
  case object BlackJackMHMobile extends GameNames(id = 3670, name = "BlackJack MH Mobile")
  case object KenoMobile extends GameNames(id = 3642, name = "Keno Mobile")
  case object DeucesWildMHMobile extends GameNames(id = 3658, name = "Deuces Wild MH Mobile")

  case object Default extends GameNames(id = -1, name = "Not defined")

  def values: Set[GameNames] = sealerate.values[GameNames]

  def apply(id: Int): GameNames = values.find(_.id == id).getOrElse(Default)

}
