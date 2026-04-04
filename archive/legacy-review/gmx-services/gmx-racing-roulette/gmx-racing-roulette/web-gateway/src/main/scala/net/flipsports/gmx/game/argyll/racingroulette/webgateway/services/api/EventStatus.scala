package net.flipsports.gmx.game.argyll.racingroulette.webgateway.services.api

import enumeratum._

sealed trait EventStatus extends EnumEntry

object EventStatus extends PlayEnum[EventStatus] {
  val values = findValues

  case object NotStarted extends EventStatus

  case object RaceOff extends EventStatus

  case object Resulted extends EventStatus

}
