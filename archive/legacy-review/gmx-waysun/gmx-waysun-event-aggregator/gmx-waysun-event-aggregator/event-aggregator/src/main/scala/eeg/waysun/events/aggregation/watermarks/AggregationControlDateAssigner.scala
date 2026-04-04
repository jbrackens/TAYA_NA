package eeg.waysun.events.aggregation.watermarks

import eeg.waysun.events.aggregation.Types
import org.apache.flink.streaming.api.functions.AssignerWithPeriodicWatermarks

class AggregationControlDateAssigner extends NowAssignerWithPeriodicWatermarks[Types.AggregationControl.Source]

object AggregationControlDateAssigner {

  def apply(): AssignerWithPeriodicWatermarks[Types.AggregationControl.Source] = new AggregationControlDateAssigner()

}
