package eeg.waysun.events.aggregation.watermarks

import eeg.waysun.events.aggregation.Types
import org.apache.flink.streaming.api.functions.AssignerWithPeriodicWatermarks

class AggregationInstanceCreationDateAssigner
    extends NowAssignerWithPeriodicWatermarks[Types.AggregationResult.KeyedType]

object AggregationInstanceCreationDateAssigner {
  def apply(): AssignerWithPeriodicWatermarks[Types.AggregationResult.KeyedType] =
    new AggregationInstanceCreationDateAssigner()
}
