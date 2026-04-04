package net.flipsports.gmx.streaming.sbtech.dictionaries

import ca.mrvisser.sealerate

sealed abstract class GameTypes(val id: Int, val name: String)

object GameTypes {


  case object BlackjackISBGames extends GameTypes(id = 280, name = "Blackjack ISB - Games")
  case object RouletteISBGames extends GameTypes(id = 283, name = "Roulette ISB - Games")
  case object EvolutionLiveRouletteGames extends GameTypes(id = 601, name = "Evolution Live Roulette - Games")
  case object EvolutionLiveBlackjackGames extends GameTypes(id = 603, name = "Evolution Live Blackjack - Games")
  case object MIcrogamingBlackjackGames extends GameTypes(id = 70, name = "MIcrogaming Blackjack - Games")
  case object MicrogamingVideoPoker extends GameTypes(id = 48, name = "Microgaming Video Poker")
  case object PNGVideoPoker extends GameTypes(id = 524, name = "PNG Video Poker")
  case object EvolutionLiveWheelGames extends GameTypes(id = 635, name = "Evolution Live Wheel - Games")
  case object EvolutionLiveBaccaratGames extends GameTypes(id = 605, name = "Evolution Live Baccarat - Games")
  case object EvolutionLiveMegaBallGames extends GameTypes(id = 966, name = "Evolution Live Mega Ball - Games")
  case object InspiredTableGames extends GameTypes(id = 900, name = "Inspired Table - Games")
  case object EvolutionDragonTigerGames extends GameTypes(id = 673, name = "Evolution Dragon Tiger - Games")
  case object EvolutionTopCardGames extends GameTypes(id = 677, name = "Evolution Top Card - Games")
  case object EvolutionLiveCardGamesGames extends GameTypes(id = 607, name = "Evolution Live Card Games - Games")
  case object MicrogamingVideoPokerGames extends GameTypes(id = 673, name = "Evolution Dragon Tiger - Games")

  case object Default extends GameTypes(id = -1, name = "Not defined")

  def values: Set[GameTypes] = sealerate.values[GameTypes]

  def apply(id: Int): GameTypes = values.find(_.id == id).getOrElse(Default)

}