package eeg.waysun.events.validators.watermarks

import eeg.waysun.events.validators.Types
import eeg.waysun.events.validators.Types.Definition.Source
import net.flipsports.gmx.streaming.common.conversion.TimeOps
import org.apache.flink.streaming.api.functions.AssignerWithPeriodicWatermarks
import org.apache.flink.streaming.api.watermark.Watermark

class DefinitionEventCreationDateAssigner extends AssignerWithPeriodicWatermarks[Types.Definition.Source] {

  override def getCurrentWatermark: Watermark = new Watermark(TimeOps.nowEpochInMilliAtUtc())

  override def extractTimestamp(element: Source, previousElementTimestamp: Long): Long = TimeOps.nowEpochInMilliAtUtc()

}

object DefinitionEventCreationDateAssigner {

  def apply(): AssignerWithPeriodicWatermarks[Types.Definition.Source] = new DefinitionEventCreationDateAssigner()

}
