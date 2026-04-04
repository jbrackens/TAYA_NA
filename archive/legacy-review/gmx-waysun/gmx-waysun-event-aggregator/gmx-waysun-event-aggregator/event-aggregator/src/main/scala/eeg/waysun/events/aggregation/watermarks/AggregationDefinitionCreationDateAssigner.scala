package eeg.waysun.events.aggregation.watermarks

import eeg.waysun.events.aggregation.Types
import org.apache.flink.streaming.api.functions.AssignerWithPeriodicWatermarks

class AggregationDefinitionCreationDateAssigner
    extends NowAssignerWithPeriodicWatermarks[Types.AggregationDefinition.Source]

object AggregationDefinitionCreationDateAssigner {

  def apply(): AssignerWithPeriodicWatermarks[Types.AggregationDefinition.Source] =
    new AggregationDefinitionCreationDateAssigner()

}
