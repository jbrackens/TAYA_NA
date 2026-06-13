package net.flipsports.gmx.streaming.sbtech.udf

import net.flipsports.gmx.streaming.sbtech.SportEventsTypes.SportEventUpdate
import org.apache.flink.api.common.functions.ReduceFunction

class DeduplicateEventEventsFunction extends ReduceFunction[SportEventUpdate.Source] {
  override def reduce(left: SportEventUpdate.Source, right: SportEventUpdate.Source): SportEventUpdate.Source ={
    if (left == null || right == null)
      return right
    if (left.f1.getMessageOriginDateUTC >= right.f1.getMessageOriginDateUTC)
      left
    else
      right
  }
}

object DeduplicateEventEventsFunction {

  def apply(): ReduceFunction[SportEventUpdate.Source] = new DeduplicateEventEventsFunction
}

