package net.flipsports.gmx.streaming.sbtech.udf

import net.flipsports.gmx.streaming.sbtech.SourceTypes.Market
import org.apache.flink.api.common.functions.ReduceFunction

class DeduplicateMarketEventsFunction extends ReduceFunction[Market.Source]{
  override def reduce(left: Market.Source, right: Market.Source): Market.Source ={
    if (left == null || right == null)
      return right
    if (left.f1.getLastUpdateDateTime >= right.f1.getLastUpdateDateTime)
      left
    else
      right
  }
}


object DeduplicateMarketEventsFunction {
  def apply(): ReduceFunction[Market.Source] = new DeduplicateMarketEventsFunction
}
