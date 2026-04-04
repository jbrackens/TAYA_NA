package eeg.waysun.events.achievements.watermarks

import eeg.waysun.events.achievements.Types
import eeg.waysun.events.achievements.Types.DefinitionType.Source
import net.flipsports.gmx.streaming.common.conversion.TimeOps
import org.apache.flink.streaming.api.functions.AssignerWithPeriodicWatermarks
import org.apache.flink.streaming.api.watermark.Watermark

class DefinitionEventCreationDateAssigner extends AssignerWithPeriodicWatermarks[Types.DefinitionType.Source] {

  override def getCurrentWatermark: Watermark = new Watermark(TimeOps.nowEpochInMilliAtUtc())

  override def extractTimestamp(element: Source, previousElementTimestamp: Long): Long = TimeOps.nowEpochInMilliAtUtc()

}

object DefinitionEventCreationDateAssigner {

  def apply(): AssignerWithPeriodicWatermarks[Types.DefinitionType.Source] = new DefinitionEventCreationDateAssigner()

}
