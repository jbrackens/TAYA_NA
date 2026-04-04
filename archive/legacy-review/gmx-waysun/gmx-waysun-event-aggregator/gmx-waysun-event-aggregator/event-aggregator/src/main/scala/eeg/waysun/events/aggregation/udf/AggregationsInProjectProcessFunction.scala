package eeg.waysun.events.aggregation.udf

import eeg.waysun.events.aggregation.Types.{AggregationDefinition, AggregationsInProjects}
import net.flipsports.gmx.streaming.common.conversion.StringOps._
import net.flipsports.gmx.streaming.common.job.streams.dto.KeyValue
import org.apache.flink.api.common.functions.MapFunction

class AggregationsInProjectProcessFunction
    extends MapFunction[AggregationDefinition.KeyedType, AggregationsInProjects.KeyedType] {
  override def map(source: AggregationDefinition.KeyedType): AggregationsInProjects.KeyedType = {
    val key = source.key.projectId
    val value = source.key.getRuleId
    KeyValue(key, value)
  }
}
