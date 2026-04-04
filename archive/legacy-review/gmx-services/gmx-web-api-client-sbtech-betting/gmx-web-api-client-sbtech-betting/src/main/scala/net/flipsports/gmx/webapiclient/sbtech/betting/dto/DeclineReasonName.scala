package net.flipsports.gmx.webapiclient.sbtech.betting.dto

import enumeratum._

sealed trait DeclineReasonName extends EnumEntry

object DeclineReasonName extends PlayEnum[DeclineReasonName] {
  val values = findValues

  case object StakeTooLow extends DeclineReasonName

  case object StakeTooHigh extends DeclineReasonName

  case object OddsNotMatch extends DeclineReasonName

  case object PointsNotMatch extends DeclineReasonName

  case object SelectionClosed extends DeclineReasonName

  case object SelectionSuspended extends DeclineReasonName

}
