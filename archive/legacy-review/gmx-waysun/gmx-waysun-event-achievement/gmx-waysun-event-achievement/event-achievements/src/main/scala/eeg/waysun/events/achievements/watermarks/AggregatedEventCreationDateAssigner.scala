package eeg.waysun.events.achievements.watermarks

import eeg.waysun.events.achievements.Types
import net.flipsports.gmx.streaming.common.conversion.TimeOps
import org.apache.flink.streaming.api.functions.AssignerWithPeriodicWatermarks
import org.apache.flink.streaming.api.watermark.Watermark

class AggregatedEventCreationDateAssigner extends AssignerWithPeriodicWatermarks[Types.AggregatedType.Source] {

  override def getCurrentWatermark: Watermark = new Watermark(TimeOps.nowEpochInMilliAtUtc())

  override def extractTimestamp(element: Types.AggregatedType.Source, previousElementTimestamp: Long): Long =
    TimeOps.nowEpochInMilliAtUtc()

}

object AggregatedEventCreationDateAssigner {

  def apply(): AggregatedEventCreationDateAssigner = new AggregatedEventCreationDateAssigner()
}
