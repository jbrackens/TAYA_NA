package net.flipsports.gmx.streaming.sbtech.helpers.v1



sealed abstract class FilteredType(val code: Long, val description: String)

object FilteredType {
  case object AmountLessThanMinim extends FilteredType(1, "Stake amount is less than minimum value 0.01.")

  case object NotFreebetAndNotSettled extends FilteredType(2, "Its free bet ands its not settled.")

  case object  HasOriginalSqlTicketIdNotEmpty extends FilteredType(3, "Bet has original sql ticker id not empty. It's child. Only parent bet should be topup (partial cash out).")

  case object PartialBetsNotSettled extends FilteredType(4, "Child's of parent bet not settled (partial cash out).")

  case object BetisNotSettled extends FilteredType(5, "Bet is not settled")

  case object ItsFreeBet extends FilteredType(6, "Bet is free bet.")
}
