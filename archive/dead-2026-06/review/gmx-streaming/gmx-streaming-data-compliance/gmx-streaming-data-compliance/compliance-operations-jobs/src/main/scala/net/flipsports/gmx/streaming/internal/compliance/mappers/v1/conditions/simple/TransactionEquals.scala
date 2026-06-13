package net.flipsports.gmx.streaming.internal.compliance.mappers.v1.conditions.simple

import net.flipsports.gmx.streaming.common.functions.Predicate
import net.flipsports.gmx.streaming.internal.compliance.Types.WalletTransactions.ValueType
import net.flipsports.gmx.streaming.internal.compliance._
import net.flipsports.gmx.streaming.internal.compliance.dictionaries.TransactionStatus

class TransactionEquals(val transactionStatus: TransactionStatus) extends Predicate[ValueType] {

  override def test(record: ValueType): Boolean = transactionStatus.statusMatch(record.getStatus)

}

object TransactionEquals extends Serializable {

  def confirmed(): TransactionEquals = new TransactionEquals(TransactionStatus.Confirmed)

}
