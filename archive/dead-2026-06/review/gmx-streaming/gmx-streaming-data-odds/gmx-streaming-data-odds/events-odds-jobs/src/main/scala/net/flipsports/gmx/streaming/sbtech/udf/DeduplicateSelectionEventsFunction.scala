package net.flipsports.gmx.streaming.sbtech.udf

import net.flipsports.gmx.streaming.sbtech.SourceTypes.Selection
import org.apache.flink.api.common.functions.ReduceFunction

class DeduplicateSelectionEventsFunction extends ReduceFunction[Selection.Source]{
  override def reduce(left: Selection.Source, right: Selection.Source): Selection.Source = {
    if (left == null || right == null)
      return right
    if (left.f1.getLastUpdateDateTime >= right.f1.getLastUpdateDateTime)
      left
    else
      right
  }
}

object DeduplicateSelectionEventsFunction {

  def apply(): ReduceFunction[Selection.Source] = new DeduplicateSelectionEventsFunction
}