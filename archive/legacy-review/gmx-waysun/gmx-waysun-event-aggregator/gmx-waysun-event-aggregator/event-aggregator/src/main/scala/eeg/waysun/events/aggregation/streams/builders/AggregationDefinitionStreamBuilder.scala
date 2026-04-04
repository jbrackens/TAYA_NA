package eeg.waysun.events.aggregation.streams.builders

import eeg.waysun.events.aggregation.streams.StepNames
import eeg.waysun.events.aggregation.watermarks.AggregationDefinitionCreationDateAssigner
import eeg.waysun.events.aggregation.{Implicits, Types}
import net.flipsports.gmx.streaming.common.job.builders.SourceDataStreamBuilder
import net.flipsports.gmx.streaming.common.job.streams.dto.KeyValue
import org.apache.flink.annotation.VisibleForTesting
import org.apache.flink.streaming.api.functions.source.SourceFunction
import org.apache.flink.streaming.api.scala.{DataStream, StreamExecutionEnvironment}

object AggregationDefinitionStreamBuilder extends Serializable {

  def build(
      env: StreamExecutionEnvironment,
      source: SourceFunction[Types.AggregationDefinition.Source]): Types.Stream.AggregationDefinitionKeyedDataStream = {
    buildTopology {
      SourceDataStreamBuilder.withSource[Types.AggregationDefinition.Source](
        env,
        source,
        StepNames.aggregationDefinitionSource)(Implicits.AggregationDefinitionImplicit.source)
    }
  }

  @VisibleForTesting
  def buildTopology(dataStream: => DataStream[Types.AggregationDefinition.Source])
      : Types.Stream.AggregationDefinitionKeyedDataStream = {
    dataStream
      .assignTimestampsAndWatermarks(AggregationDefinitionCreationDateAssigner())
      .name(StepNames.streamAggregationDefinitionSource)
      .map(KeyValue.fromTuple2(_))(Implicits.AggregationDefinitionImplicit.keyed)
  }

}
