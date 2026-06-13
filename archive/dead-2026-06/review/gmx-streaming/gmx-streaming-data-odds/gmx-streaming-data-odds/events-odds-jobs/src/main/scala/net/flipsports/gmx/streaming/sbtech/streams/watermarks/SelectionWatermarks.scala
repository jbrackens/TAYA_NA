package net.flipsports.gmx.streaming.sbtech.streams.watermarks

import net.flipsports.gmx.streaming.sbtech.SourceTypes
import org.apache.flink.streaming.api.functions.AssignerWithPeriodicWatermarks

class SelectionWatermarks(maximumDelay: Long = lag) extends EventEntranceWatermarkWithMaximumDelay[SourceTypes.Selection.Source]((maximumDelay))

object SelectionWatermarks {

  def apply(): AssignerWithPeriodicWatermarks[SourceTypes.Selection.Source] = new SelectionWatermarks()

}