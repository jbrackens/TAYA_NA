package eeg.waysun.events.aggregation.streams.dto

case class AggregationStatistics(min: Long, max: Long, count: Long, sum: Long, custom: String) extends Serializable
