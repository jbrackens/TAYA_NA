package eeg.waysun.events.achievements.operations

object AggregationFunctions {

  val sum = "sum"

  val min = "min"

  val max = "max"

  val count = "count"

  val all: Seq[String] = Seq(sum, min, max, count)
}
