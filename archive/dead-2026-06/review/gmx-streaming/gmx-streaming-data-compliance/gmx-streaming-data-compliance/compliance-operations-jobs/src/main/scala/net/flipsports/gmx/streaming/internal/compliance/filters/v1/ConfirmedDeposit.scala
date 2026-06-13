package net.flipsports.gmx.streaming.internal.compliance.filters.v1

import net.flipsports.gmx.streaming.internal.compliance.Types.WalletTransactions.{KeyType, ValueType}
import net.flipsports.gmx.streaming.internal.compliance.mappers.v1.conditions.simple.{SourceEquals, TransactionEquals}
import org.apache.flink.api.common.functions.FilterFunction
import org.apache.flink.api.java.tuple.Tuple2

class ConfirmedDeposit extends FilterFunction[Tuple2[KeyType, ValueType]] {

  val sourceEquals = SourceEquals.deposit()

  val transactionEquals = TransactionEquals.confirmed()

  override def filter(record: Tuple2[KeyType, ValueType]): Boolean = sourceEquals.and(transactionEquals).test(record.f1)

}


object ConfirmedDeposit extends Serializable {

  def apply(): ConfirmedDeposit = new ConfirmedDeposit()

}

