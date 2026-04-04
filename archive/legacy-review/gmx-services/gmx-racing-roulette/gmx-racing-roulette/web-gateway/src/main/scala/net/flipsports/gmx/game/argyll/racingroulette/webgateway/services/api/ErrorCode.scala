package net.flipsports.gmx.game.argyll.racingroulette.webgateway.services.api

import enumeratum._

sealed trait ErrorCode extends EnumEntry

object ErrorCode extends PlayEnum[ErrorCode] {
  val values = findValues

  case object EventDataNotReady extends ErrorCode

  case object EventNotSupported extends ErrorCode

  case object BetRejectedRaceOff extends ErrorCode

  case object BetRejectedOddsChanged extends ErrorCode

  case object Unexpected extends ErrorCode

}
