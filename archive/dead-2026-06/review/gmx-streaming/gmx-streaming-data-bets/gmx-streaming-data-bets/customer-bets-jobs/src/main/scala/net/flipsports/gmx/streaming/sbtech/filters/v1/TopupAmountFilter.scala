package net.flipsports.gmx.streaming.sbtech.filters.v1

import org.apache.flink.api.common.functions.FilterFunction
import net.flipsports.gmx.streaming.sbtech.Types
import net.flipsports.gmx.streaming.sbtech.Types.Topup.Source

protected class TopupAmountFilter extends FilterFunction[Types.Topup.Source] {
  override def filter(value: Source): Boolean = value.f1.getAmount > 0.01
}


object TopupAmountFilter {

  def apply(): FilterFunction[Types.Topup.Source] = new TopupAmountFilter()
}