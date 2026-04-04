package com.betconstruct.avro.enigma.details


import ca.mrvisser.sealerate

sealed abstract class MessageType(val name: String, operation: Operation)

sealed abstract class Operation(val name: String)

object Operation {
  case object CasinoTransaction extends Operation("CasinoTransaction")
  case object SportsbookTransaction extends Operation("SportsbookTransaction")
  case object FinanceTransaction extends Operation("FinanceTransaction")
  case object BonusOperation extends Operation("BonusOperation")
  case object ClientOperation extends Operation("ClientOperation")
  case object Missing extends Operation("Missing")
}

object MessageType {

  case object ClientSelfExcluded extends MessageType("ClientSelfExcluded", Operation.ClientOperation)

  case object ClientLogin extends MessageType("ClientLogin", Operation.ClientOperation)

  case object ClientRegistered extends MessageType("ClientRegistered", Operation.ClientOperation)

  case object ClientVerification extends MessageType("ClientVerification", Operation.ClientOperation)

  case object ClientRegistration extends MessageType("ClientRegistration", Operation.ClientOperation)

  case object WalletBalance extends MessageType("WalletBalance", Operation.Missing)

  case object SportsBookBet extends MessageType("SportsbookBet", Operation.SportsbookTransaction)

  case object CalculatedSportsbookBet extends MessageType("CalculatedSportsbookBet", Operation.SportsbookTransaction)

  case object SportsBookWin extends MessageType("SportsbookWin", Operation.SportsbookTransaction)

  case object CasinoBet extends MessageType("CasinoBet", Operation.CasinoTransaction)

  case object CasinoWin extends MessageType("CasinoWin", Operation.CasinoTransaction)

  case object Deposit extends MessageType("Deposit", Operation.FinanceTransaction)

  case object Withdrawal extends MessageType("Withdrawal", Operation.FinanceTransaction)

  case object WithdrawalRejected extends MessageType("WithdrawalRejected", Operation.FinanceTransaction)

  case object Bonus extends MessageType("Bonus", Operation.FinanceTransaction)

  case object BonusAccepted extends MessageType("BonusAccepted", Operation.BonusOperation)

  case object BonusUsage extends MessageType("BonusUsage", Operation.BonusOperation)

  case object Missing extends MessageType("Missing", Operation.Missing)

  def values: Set[MessageType] = sealerate.values[MessageType]

  def apply(id: String): Option[MessageType] = values.find(_.name == id)

}
