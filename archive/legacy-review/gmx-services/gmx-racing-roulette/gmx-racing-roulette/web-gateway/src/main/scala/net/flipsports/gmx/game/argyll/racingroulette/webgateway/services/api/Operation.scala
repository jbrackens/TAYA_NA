package net.flipsports.gmx.game.argyll.racingroulette.webgateway.services.api

import enumeratum._

sealed trait Operation extends EnumEntry

object Operation extends PlayEnum[Operation] {
  val values = findValues

  case object SubscribeEvent extends Operation

  case object EventUpdate extends Operation

  case object CalculateReturn extends Operation

  case object PlaceBets extends Operation

}