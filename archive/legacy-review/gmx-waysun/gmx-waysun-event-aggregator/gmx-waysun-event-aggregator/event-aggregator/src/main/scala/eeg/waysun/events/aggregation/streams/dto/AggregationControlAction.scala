package eeg.waysun.events.aggregation.streams.dto

import ca.mrvisser.sealerate

sealed abstract class AggregationControlAction(name: String) {

  def is(code: String) = code.equalsIgnoreCase(name)
}

object AggregationControlAction {

  case object Default extends AggregationControlAction("NONE")

  case object Publish extends AggregationControlAction("PUBLISH")

  case object Clear extends AggregationControlAction(name = "CLEAR")

  case object Remove extends AggregationControlAction(name = "REMOVE")

  case object Update extends AggregationControlAction(name = "UPDATE")

  def values: Set[AggregationControlAction] = sealerate.values[AggregationControlAction]

  def code(code: String): AggregationControlAction = values.find(_.is(code)).getOrElse(Default)

}
