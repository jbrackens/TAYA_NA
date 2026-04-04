package net.flipsports.gmx.game.argyll.racingroulette.webgateway.services.api

import enumeratum._

sealed trait SelectionStatus extends EnumEntry

object SelectionStatus extends PlayEnum[SelectionStatus] {
  val values = findValues

  case object Active extends SelectionStatus

  case object Disabled extends SelectionStatus

  case object NonRunner extends SelectionStatus

}