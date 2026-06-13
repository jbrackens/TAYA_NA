package phoenix.markets

import enumeratum.CirceEnum
import enumeratum.Enum
import enumeratum.EnumEntry
import enumeratum.EnumEntry.Uppercase

sealed trait MarketVisibility extends EnumEntry with Uppercase
object MarketVisibility extends Enum[MarketVisibility] with CirceEnum[MarketVisibility] {
  lazy val values: IndexedSeq[MarketVisibility] = findValues

  final case object Enabled extends MarketVisibility
  final case object Featured extends MarketVisibility
  final case object Disabled extends MarketVisibility
}
