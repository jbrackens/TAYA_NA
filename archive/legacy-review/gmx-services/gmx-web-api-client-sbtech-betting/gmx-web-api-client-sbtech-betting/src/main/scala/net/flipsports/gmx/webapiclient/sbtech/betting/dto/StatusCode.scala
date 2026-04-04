package net.flipsports.gmx.webapiclient.sbtech.betting.dto

import enumeratum._

sealed trait StatusCode extends EnumEntry

object StatusCode extends PlayEnum[StatusCode] {
  val values = findValues

  case object InvalidSelection extends StatusCode

  case object OddsNotMatch extends StatusCode

  case object PurchaseNotAccepted extends StatusCode

}
