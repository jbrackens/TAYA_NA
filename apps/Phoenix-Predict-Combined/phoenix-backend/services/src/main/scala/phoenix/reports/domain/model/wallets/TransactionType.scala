package phoenix.reports.domain.model.wallets

import scala.collection.immutable.IndexedSeq

import enumeratum.Enum
import enumeratum.EnumEntry
import enumeratum.EnumEntry.UpperSnakecase

sealed trait TransactionType extends EnumEntry with UpperSnakecase

object TransactionType extends Enum[TransactionType] {
  def values: IndexedSeq[TransactionType] = findValues

  final case object Deposit extends TransactionType
  final case object Withdrawal extends TransactionType
}
