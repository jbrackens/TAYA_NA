package net.flipsports.gmx.streaming.internal.compliance.mappers.v1.conditions.simple

import net.flipsports.gmx.streaming.common.functions.Predicate
import net.flipsports.gmx.streaming.internal.compliance.Types
import Types.WalletTransactions.ValueType
import net.flipsports.gmx.streaming.internal.compliance.dictionaries.SourceType
import net.flipsports.gmx.streaming.internal.compliance._

class SourceEquals(val sourceType: SourceType) extends Predicate[Types.WalletTransactions.ValueType] {
  override def test(value: ValueType): Boolean = sourceType.sourceMatch(value.getSource)
}

object SourceEquals {


  def deposit() = new SourceEquals(SourceType.Deposit)

}
