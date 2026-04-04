package eeg.waysun.events.aggregation.streams.dto

case class AggregationControl(command: String, action: String, value: String) extends Serializable
