package net.flipsports.gmx.streaming.common.job.streams

import org.apache.flink.api.common.state.ValueStateDescriptor

object Descriptors {

  val lastFiringTime: ValueStateDescriptor[Long] = new ValueStateDescriptor("eeg-streaming-events-last-firing-time", classOf[Long])

}
