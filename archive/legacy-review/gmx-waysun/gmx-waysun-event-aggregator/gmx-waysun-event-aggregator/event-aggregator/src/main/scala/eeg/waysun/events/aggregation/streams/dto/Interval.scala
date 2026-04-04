package eeg.waysun.events.aggregation.streams.dto

import stella.dataapi.aggregation.IntervalType

case class Interval(interval: String, intervalLength: Int) {

  val intervalType: IntervalType = IntervalType.valueOf(interval)

}
