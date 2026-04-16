package phoenix.wallets.domain

import enumeratum._

sealed trait DebitFundsReason extends EnumEntry with EnumEntry.UpperSnakecase
object DebitFundsReason extends Enum[DebitFundsReason] {
  override val values = findValues

  final case object Withdrawal extends DebitFundsReason
  final case object Adjustment extends DebitFundsReason
}

sealed trait CreditFundsReason extends EnumEntry with EnumEntry.UpperSnakecase
object CreditFundsReason extends Enum[CreditFundsReason] {
  override val values = findValues

  final case object Deposit extends CreditFundsReason
  final case object Adjustment extends CreditFundsReason
}
