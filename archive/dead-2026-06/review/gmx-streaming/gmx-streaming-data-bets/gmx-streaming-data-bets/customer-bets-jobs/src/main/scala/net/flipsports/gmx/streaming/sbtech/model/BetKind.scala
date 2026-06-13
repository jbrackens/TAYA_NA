package net.flipsports.gmx.streaming.sbtech.model

sealed trait BetKind

object BetKind {

  case object CasinoBet extends BetKind

  case object SportBet extends BetKind

}
