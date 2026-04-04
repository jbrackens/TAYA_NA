package eeg.waysun.events.aggregation.watermarks

import net.flipsports.gmx.streaming.common.conversion.TimeOps
import org.apache.flink.streaming.api.functions.AssignerWithPeriodicWatermarks
import org.apache.flink.streaming.api.watermark.Watermark

class NowAssignerWithPeriodicWatermarks[T] extends AssignerWithPeriodicWatermarks[T] {

  override def getCurrentWatermark: Watermark = new Watermark(TimeOps.nowEpochInMilliAtUtc())

  override def extractTimestamp(element: T, previousElementTimestamp: Long): Long = TimeOps.nowEpochInMilliAtUtc()

}

object NowAssignerWithPeriodicWatermarks {

  def apply[T](): AssignerWithPeriodicWatermarks[T] = new NowAssignerWithPeriodicWatermarks[T]()

}
