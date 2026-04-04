package eeg.waysun.events.validators.watermarks

import eeg.waysun.events.validators.Types
import net.flipsports.gmx.streaming.common.conversion.TimeOps
import org.apache.flink.streaming.api.functions.AssignerWithPeriodicWatermarks
import org.apache.flink.streaming.api.watermark.Watermark

class RawEventCreationDateAssigner(val maximumLag: Long) extends AssignerWithPeriodicWatermarks[Types.Raw.Source] {

  override def getCurrentWatermark: Watermark = new Watermark(TimeOps.nowEpochInMilliAtUtc())

  override def extractTimestamp(element: Types.Raw.Source, previousElementTimestamp: Long): Long =
    TimeOps.nowEpochInMilliAtUtc()
}

object RawEventCreationDateAssigner {

  def apply(maximumLag: Long = 0): RawEventCreationDateAssigner = new RawEventCreationDateAssigner(maximumLag)
}
