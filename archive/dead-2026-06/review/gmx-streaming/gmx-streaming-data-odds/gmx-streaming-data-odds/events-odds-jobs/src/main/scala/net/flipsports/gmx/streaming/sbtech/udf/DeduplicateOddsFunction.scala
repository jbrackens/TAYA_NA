package net.flipsports.gmx.streaming.sbtech.udf

import net.flipsports.gmx.streaming.sbtech.SourceTypes
import net.flipsports.gmx.streaming.sbtech.SourceTypes.Odds.Source
import org.apache.flink.api.common.functions.ReduceFunction

class DeduplicateOddsFunction extends ReduceFunction[SourceTypes.Odds.Source]{
  override def reduce(left: Source, right: Source): Source = {
    if (left.eventTimestamp >= right.eventTimestamp)
      left
    else
      right
  }
}

object DeduplicateOddsFunction {

  def apply(): ReduceFunction[SourceTypes.Odds.Source] = new DeduplicateOddsFunction()

}