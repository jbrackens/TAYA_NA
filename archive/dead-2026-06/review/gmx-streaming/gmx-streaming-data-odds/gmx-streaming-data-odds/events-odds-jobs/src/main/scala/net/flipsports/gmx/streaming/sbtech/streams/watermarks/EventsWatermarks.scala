package net.flipsports.gmx.streaming.sbtech.streams.watermarks

import net.flipsports.gmx.streaming.sbtech.SourceTypes
import org.apache.flink.streaming.api.functions.AssignerWithPeriodicWatermarks

class EventsWatermarks(maximumDelay: Long = lag) extends  EventEntranceWatermarkWithMaximumDelay[SourceTypes.Event.Source](maximumDelay)

object EventsWatermarks {

  def apply(): AssignerWithPeriodicWatermarks[SourceTypes.Event.Source] = new EventsWatermarks()

}