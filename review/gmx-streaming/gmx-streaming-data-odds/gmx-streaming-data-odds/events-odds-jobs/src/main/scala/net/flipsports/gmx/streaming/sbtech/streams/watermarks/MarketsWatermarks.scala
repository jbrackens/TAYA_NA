package net.flipsports.gmx.streaming.sbtech.streams.watermarks

import net.flipsports.gmx.streaming.sbtech.SourceTypes
import org.apache.flink.streaming.api.functions.AssignerWithPeriodicWatermarks

class MarketsWatermarks(maximumDelay: Long = lag) extends EventEntranceWatermarkWithMaximumDelay[SourceTypes.Market.Source](maximumDelay)

object MarketsWatermarks {

  def apply(): AssignerWithPeriodicWatermarks[SourceTypes.Market.Source] = new MarketsWatermarks()

}